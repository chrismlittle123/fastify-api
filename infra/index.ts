import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as crypto from "crypto";
import { defineConfig, createSecret, createContainer } from "@palindrom-ai/infra";

// Get configuration
const pulumiConfig = new pulumi.Config();
const environment = pulumiConfig.require("environment");
const gcpConfig = new pulumi.Config("gcp");
const gcpProject = gcpConfig.require("project");
const region = gcpConfig.require("region");

// Initialize infra package config
defineConfig({
  cloud: "gcp",
  region: region,
  project: "fastify-api",
  environment: environment,
});

// Naming convention
const namePrefix = `fastify-api-${environment}`;

// Common labels
const labels = {
  environment,
  service: "fastify-api",
  "managed-by": "pulumi",
};

// =============================================================================
// Enable required APIs (not yet in @palindrom-ai/infra)
// =============================================================================
const enabledApis = [
  "run.googleapis.com",
  "secretmanager.googleapis.com",
  "artifactregistry.googleapis.com",
  "iam.googleapis.com",
].map((api) => new gcp.projects.Service(`enable-${api.split('.')[0]}`, {
  project: gcpProject,
  service: api,
  disableOnDestroy: false,
}));

// =============================================================================
// Artifact Registry (not yet in @palindrom-ai/infra)
// =============================================================================
const artifactRegistry = new gcp.artifactregistry.Repository(`${namePrefix}-repo`, {
  repositoryId: namePrefix.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
  location: region,
  format: "DOCKER",
  description: "Docker repository for fastify-api",
  labels,
}, { dependsOn: enabledApis });

// =============================================================================
// Secret Manager - JWT Secret (using @palindrom-ai/infra)
// =============================================================================
const jwtSecretValue = crypto.randomBytes(32).toString("base64");
const jwtSecret = createSecret("jwt", {
  value: jwtSecretValue,
});

// =============================================================================
// Cloud Run Service (using @palindrom-ai/infra)
// =============================================================================
const container = createContainer("api", {
  image: "gcr.io/cloudrun/hello", // Placeholder - updated after first push
  port: 8080,
  size: environment === "prod" ? "large" : "small",
  replicas: environment === "prod" ? 10 : 3,
  healthCheckPath: "/health",
  environment: {
    NODE_ENV: "production",
    APP_NAME: "fastify-api",
    LOG_LEVEL: environment === "prod" ? "info" : "debug",
    DOCS_TITLE: "Fastify API",
    DOCS_DESCRIPTION: `Fastify API - ${environment} environment`,
    // Note: JWT_SECRET is passed via link below
  },
  link: [jwtSecret],
});

// =============================================================================
// Outputs
// =============================================================================
export const serviceUrl = container.url;
export const serviceName = container.serviceArn;
export const artifactRegistryUrl = pulumi.interpolate`${region}-docker.pkg.dev/${gcpProject}/${artifactRegistry.repositoryId}`;
export const jwtSecretName = jwtSecret.secretName;
