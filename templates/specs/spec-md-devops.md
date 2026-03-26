# SPEC.md — {project_name}

## Product Overview
{description}

## Infrastructure Stack
| Layer            | Technology                        |
|------------------|-----------------------------------|
| Language         | {tech_stack_table}                |{docker_row}
| IaC              | [e.g. Terraform, Pulumi, CDK]    |
| Container Runtime| [e.g. Docker, Podman]            |
| Orchestration    | [e.g. Kubernetes, ECS, Nomad]    |
| CI/CD            | [e.g. GitHub Actions, GitLab CI] |
| Registry         | [e.g. ECR, GHCR, Docker Hub]     |
| DNS / CDN        | [e.g. Cloudflare, Route53+CF]    |
| Secrets          | [e.g. Vault, AWS SSM, SOPS]      |

## Environments
| Name        | URL / Endpoint              | Purpose                    | Access              |
|-------------|-----------------------------|----------------------------|---------------------|
| Development | [dev.example.com]           | [Feature testing]          | [Team-wide]         |
| Staging     | [staging.example.com]       | [Pre-prod validation]      | [Team + QA]         |
| Production  | [example.com]               | [Live user traffic]        | [Restricted]        |
| [add env...] | [url]                      | [purpose]                  | [who has access]    |

**Promotion flow:** Development -> Staging -> Production
[Describe how code and config move between environments — automated, manual gate, etc.]

## CI/CD Pipeline
```
[push] -> Lint -> Test -> Build -> [merge to main] -> Deploy Staging -> Smoke Tests
                                   [tag pushed]    -> Deploy Production -> Smoke Tests -> Post-deploy checks
```
| Stage              | Trigger          | Actions                              |
|--------------------|------------------|--------------------------------------|
| Lint & Test        | Every push       | [Linter, type check, unit tests]     |
| Build              | PR to main       | [Docker build, artifact creation]     |
| Deploy Staging     | Merge to main    | [Auto-deploy, run migrations]        |
| Deploy Production  | Git tag / manual | [Blue-green or rolling deploy]       |
| Rollback           | Manual           | [Revert to previous version]         |

## Monitoring & Alerting
| Signal          | Tool                    | Alert Threshold               |
|-----------------|-------------------------|-------------------------------|
| Uptime          | [e.g. UptimeRobot]      | [< 99.9% over 5m window]     |
| Error rate      | [e.g. Sentry, Datadog]  | [> 1% of requests]           |
| Latency (p99)   | [e.g. Prometheus+Grafana]| [> 500ms]                    |
| CPU / Memory    | [e.g. CloudWatch]       | [> 80% sustained 5m]         |
| Disk usage      | [e.g. node-exporter]    | [> 85%]                       |
| [custom metric] | [tool]                  | [threshold]                   |

- **On-call rotation:** [Describe who gets paged and escalation path]
- **Dashboards:** [List key dashboards and what they show]
- **Log aggregation:** [e.g. ELK, Loki, CloudWatch Logs — retention policy]

## Security & Compliance
- **Network:** [VPC layout, public/private subnets, security groups]
- **Secrets management:** [How secrets are stored, rotated, and accessed]
- **TLS:** [Certificate provisioning — Let's Encrypt, ACM, etc.]
- **Access control:** [IAM roles, RBAC, least-privilege approach]
- **Scanning:** [Container image scanning, dependency audit, SAST]
- **Backup & DR:** [Backup schedule, RTO/RPO targets, disaster recovery plan]
- **Compliance:** [SOC2, GDPR, HIPAA — list applicable standards]

## Implementation Phases

### Phase 1 — Foundation
- [ ] IaC repository setup and state backend
- [ ] Networking (VPC, subnets, security groups)
- [ ] Container registry and base image
- [ ] CI pipeline (lint, test, build)
- [ ] Development environment provisioning

### Phase 2 — Deployment Pipeline
- [ ] Staging environment provisioning
- [ ] Automated deployment to staging
- [ ] Database provisioning and migration strategy
- [ ] Secrets management integration
- [ ] Production environment provisioning

### Phase 3 — Observability & Hardening
- [ ] Monitoring stack deployment
- [ ] Alerting rules and on-call setup
- [ ] Log aggregation and retention
- [ ] Security scanning in CI
- [ ] Backup automation and DR drill
- [ ] Runbook documentation for incident response
