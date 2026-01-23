import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as crypto from "crypto";

// Get configuration
const config = new pulumi.Config();
const environment = config.require("environment");
const gcpConfig = new pulumi.Config("gcp");
const project = gcpConfig.require("project");
const region = gcpConfig.require("region");

// Naming convention
const namePrefix = `fastify-api-${environment}`;

// Common labels
const labels = {
  environment,
  service: "fastify-api",
  "managed-by": "pulumi",
};

// =============================================================================
// Secret Manager - JWT Secret
// =============================================================================
const jwtSecret = new gcp.secretmanager.Secret(`${namePrefix}-jwt-secret`, {
  secretId: `${namePrefix}-jwt-secret`,
  replication: {
    auto: {},
  },
  labels,
});

// Create a secret version with a placeholder (should be updated via CLI or CI)
const jwtSecretVersion = new gcp.secretmanager.SecretVersion(`${namePrefix}-jwt-secret-version`, {
  secret: jwtSecret.id,
  secretData: pulumi.secret("change-me-this-is-a-placeholder-secret-32chars"),
});

// =============================================================================
// Cloud SQL - PostgreSQL Database
// =============================================================================
const dbInstance = new gcp.sql.DatabaseInstance(`${namePrefix}-db`, {
  name: `${namePrefix}-db`,
  region,
  databaseVersion: "POSTGRES_16",
  deletionProtection: environment === "prod",
  settings: {
    tier: environment === "prod" ? "db-custom-2-4096" : "db-f1-micro",
    availabilityType: environment === "prod" ? "REGIONAL" : "ZONAL",
    backupConfiguration: {
      enabled: true,
      startTime: "03:00",
      pointInTimeRecoveryEnabled: environment === "prod",
    },
    ipConfiguration: {
      ipv4Enabled: true,
      authorizedNetworks: [],
    },
    userLabels: labels,
  },
});

const database = new gcp.sql.Database(`${namePrefix}-database`, {
  name: "fastify_api",
  instance: dbInstance.name,
});

// Generate random password for database
const dbPasswordValue = crypto.randomBytes(24).toString("base64url");
const dbPassword = pulumi.secret(dbPasswordValue);

const dbUser = new gcp.sql.User(`${namePrefix}-db-user`, {
  name: "fastify",
  instance: dbInstance.name,
  password: dbPassword,
});

// Store the full DATABASE_URL in Secret Manager
const databaseUrlSecret = new gcp.secretmanager.Secret(`${namePrefix}-database-url`, {
  secretId: `${namePrefix}-database-url`,
  replication: {
    auto: {},
  },
  labels,
});

// Build the database URL and store it as a secret
const databaseUrl = pulumi.all([dbInstance.connectionName, dbPassword]).apply(
  ([connName, password]) =>
    `postgresql://fastify:${password}@/fastify_api?host=/cloudsql/${connName}`
);

const databaseUrlSecretVersion = new gcp.secretmanager.SecretVersion(`${namePrefix}-database-url-version`, {
  secret: databaseUrlSecret.id,
  secretData: databaseUrl,
});

// =============================================================================
// Service Account for Cloud Run
// =============================================================================
const serviceAccount = new gcp.serviceaccount.Account(`${namePrefix}-sa`, {
  accountId: `${namePrefix}-sa`.substring(0, 28).replace(/[^a-z0-9-]/g, "-"),
  displayName: `Service account for ${namePrefix}`,
});

// Grant secret access
new gcp.secretmanager.SecretIamMember(`${namePrefix}-jwt-secret-access`, {
  secretId: jwtSecret.id,
  role: "roles/secretmanager.secretAccessor",
  member: pulumi.interpolate`serviceAccount:${serviceAccount.email}`,
});

new gcp.secretmanager.SecretIamMember(`${namePrefix}-db-url-access`, {
  secretId: databaseUrlSecret.id,
  role: "roles/secretmanager.secretAccessor",
  member: pulumi.interpolate`serviceAccount:${serviceAccount.email}`,
});

// Grant Cloud SQL client access
new gcp.projects.IAMMember(`${namePrefix}-cloudsql-client`, {
  project,
  role: "roles/cloudsql.client",
  member: pulumi.interpolate`serviceAccount:${serviceAccount.email}`,
});

// =============================================================================
// Artifact Registry Repository (for Docker images)
// =============================================================================
const artifactRegistry = new gcp.artifactregistry.Repository(`${namePrefix}-repo`, {
  repositoryId: namePrefix.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
  location: region,
  format: "DOCKER",
  description: "Docker repository for fastify-api",
  labels,
});

// =============================================================================
// Cloud Run Service
// =============================================================================
const containerName = `${namePrefix}-service`.toLowerCase().replace(/[^a-z0-9-]/g, "-");

// Image URL in Artifact Registry
const imageUrl = pulumi.interpolate`${region}-docker.pkg.dev/${project}/${artifactRegistry.repositoryId}/fastify-api:latest`;

const service = new gcp.cloudrunv2.Service(`${namePrefix}-service`, {
  name: containerName,
  location: region,
  ingress: "INGRESS_TRAFFIC_ALL",
  template: {
    serviceAccount: serviceAccount.email,
    scaling: {
      minInstanceCount: environment === "prod" ? 1 : 0,
      maxInstanceCount: environment === "prod" ? 10 : 3,
    },
    volumes: [
      {
        name: "cloudsql",
        cloudSqlInstance: {
          instances: [dbInstance.connectionName],
        },
      },
    ],
    containers: [
      {
        image: imageUrl,
        ports: [{ containerPort: 8080 }],
        resources: {
          limits: {
            cpu: environment === "prod" ? "2" : "1",
            memory: environment === "prod" ? "2Gi" : "512Mi",
          },
        },
        volumeMounts: [
          {
            name: "cloudsql",
            mountPath: "/cloudsql",
          },
        ],
        envs: [
          { name: "NODE_ENV", value: "production" },
          { name: "PORT", value: "8080" },
          { name: "APP_NAME", value: "fastify-api" },
          { name: "LOG_LEVEL", value: environment === "prod" ? "info" : "debug" },
          { name: "DOCS_TITLE", value: "Fastify API" },
          { name: "DOCS_DESCRIPTION", value: `Fastify API - ${environment} environment` },
          {
            name: "DATABASE_URL",
            valueSource: {
              secretKeyRef: {
                secret: databaseUrlSecret.secretId,
                version: "latest",
              },
            },
          },
          {
            name: "JWT_SECRET",
            valueSource: {
              secretKeyRef: {
                secret: jwtSecret.secretId,
                version: "latest",
              },
            },
          },
        ],
        startupProbe: {
          httpGet: {
            path: "/health",
            port: 8080,
          },
          initialDelaySeconds: 0,
          periodSeconds: 10,
          timeoutSeconds: 3,
          failureThreshold: 3,
        },
        livenessProbe: {
          httpGet: {
            path: "/health",
            port: 8080,
          },
          periodSeconds: 30,
          timeoutSeconds: 3,
          failureThreshold: 3,
        },
      },
    ],
    labels,
  },
  traffics: [
    {
      type: "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST",
      percent: 100,
    },
  ],
}, { dependsOn: [databaseUrlSecretVersion, jwtSecretVersion, artifactRegistry] });

// Allow public access
new gcp.cloudrunv2.ServiceIamMember(`${namePrefix}-public-access`, {
  name: service.name,
  location: region,
  role: "roles/run.invoker",
  member: "allUsers",
});

// =============================================================================
// Outputs
// =============================================================================
export const serviceUrl = service.uri;
export const serviceName = service.name;
export const databaseInstanceName = dbInstance.name;
export const databaseConnectionName = dbInstance.connectionName;
export const serviceAccountEmail = serviceAccount.email;
export const artifactRegistryUrl = pulumi.interpolate`${region}-docker.pkg.dev/${project}/${artifactRegistry.repositoryId}`;
export const jwtSecretId = jwtSecret.secretId;
export const databaseUrlSecretId = databaseUrlSecret.secretId;
