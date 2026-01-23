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
// Enable required APIs
// =============================================================================
const enabledApis = [
  "run.googleapis.com",
  "secretmanager.googleapis.com",
  "artifactregistry.googleapis.com",
  "iam.googleapis.com",
].map((api, index) => new gcp.projects.Service(`enable-${api.split('.')[0]}`, {
  project,
  service: api,
  disableOnDestroy: false,
}));

// =============================================================================
// Secret Manager - JWT Secret
// =============================================================================
const jwtSecret = new gcp.secretmanager.Secret(`${namePrefix}-jwt-secret`, {
  secretId: `${namePrefix}-jwt-secret`,
  replication: {
    auto: {},
  },
  labels,
}, { dependsOn: enabledApis });

// Generate a random JWT secret
const jwtSecretValue = crypto.randomBytes(32).toString("base64");
const jwtSecretVersion = new gcp.secretmanager.SecretVersion(`${namePrefix}-jwt-secret-version`, {
  secret: jwtSecret.id,
  secretData: pulumi.secret(jwtSecretValue),
});

// =============================================================================
// Service Account for Cloud Run
// =============================================================================
const serviceAccount = new gcp.serviceaccount.Account(`${namePrefix}-sa`, {
  accountId: `${namePrefix}-sa`.substring(0, 28).replace(/[^a-z0-9-]/g, "-"),
  displayName: `Service account for ${namePrefix}`,
}, { dependsOn: enabledApis });

// Grant secret access
new gcp.secretmanager.SecretIamMember(`${namePrefix}-jwt-secret-access`, {
  secretId: jwtSecret.id,
  role: "roles/secretmanager.secretAccessor",
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
}, { dependsOn: enabledApis });

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
    containers: [
      {
        // Use a placeholder image initially - will be updated after first push
        image: "gcr.io/cloudrun/hello",
        ports: { containerPort: 8080, name: "http1" },
        resources: {
          limits: {
            cpu: environment === "prod" ? "2" : "1",
            memory: environment === "prod" ? "2Gi" : "512Mi",
          },
        },
        envs: [
          { name: "NODE_ENV", value: "production" },
          { name: "PORT", value: "8080" },
          { name: "APP_NAME", value: "fastify-api" },
          { name: "LOG_LEVEL", value: environment === "prod" ? "info" : "debug" },
          { name: "DOCS_TITLE", value: "Fastify API" },
          { name: "DOCS_DESCRIPTION", value: `Fastify API - ${environment} environment` },
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
}, { dependsOn: [jwtSecretVersion, artifactRegistry, ...enabledApis] });

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
export const serviceAccountEmail = serviceAccount.email;
export const artifactRegistryUrl = pulumi.interpolate`${region}-docker.pkg.dev/${project}/${artifactRegistry.repositoryId}`;
export const jwtSecretId = jwtSecret.secretId;
