# SPEC.md — {project_name}

## Product Overview
{description}

## Tech Stack
| Layer          | Technology                        |
|----------------|-----------------------------------|
| Language       | {tech_stack_table}                |{docker_row}
| ML Framework   | [e.g. PyTorch, scikit-learn, TF]  |
| Data Storage   | [e.g. S3, BigQuery, PostgreSQL]   |
| Orchestration  | [e.g. Airflow, Prefect, Dagster]  |
| Experiment Tracking | [e.g. MLflow, W&B, DVC]     |
| Serving        | [e.g. FastAPI, BentoML, SageMaker]|

## Data Sources
| Source            | Format    | Frequency     | Volume         | Notes                |
|-------------------|-----------|---------------|----------------|----------------------|
| [Database/API]    | [CSV/JSON]| [Daily/Real-time] | [~N rows/GB] | [Access method]     |
| [File system]     | [Parquet] | [One-time]    | [~N GB]        | [Schema notes]       |
| [External API]    | [JSON]    | [Hourly]      | [~N records]   | [Rate limits, auth]  |
| [add sources...]  | [format]  | [frequency]   | [volume]       | [notes]              |

## Pipeline Architecture
```
[Data Source] -> [Ingestion] -> [Raw Storage] -> [Validation & Cleaning]
  -> [Feature Engineering] -> [Training] / [Analytics]
  -> [Model Registry] -> [Serving / Inference]
```
[Describe each stage: tools used, data transformations, scheduling, failure handling]

## Model Architecture
[Skip this section if not an ML project]
- **Task type:** [Classification / Regression / Generation / etc.]
- **Input features:** [List key features and their types]
- **Output:** [Prediction format, e.g. class label, score, text]
- **Baseline model:** [Simple approach to benchmark against]
- **Target model:** [Architecture description — layers, parameters]
- **Training data split:** [e.g. 80/10/10 train/val/test]
- **Hyperparameters:** [Key tunable values and search strategy]

## Evaluation Metrics
| Metric       | Target   | Baseline | Purpose                          |
|--------------|----------|----------|----------------------------------|
| [Accuracy]   | [>0.95]  | [0.82]   | [Primary performance measure]    |
| [Latency]    | [<100ms] | [—]      | [Inference speed requirement]    |
| [F1 Score]   | [>0.90]  | [0.75]   | [Balance precision and recall]   |
| [add more...] | [target]| [current]| [why this metric matters]        |

- **Monitoring:** [How model drift and data quality are tracked in production]
- **Retraining trigger:** [Schedule-based, drift-based, or manual]

## Implementation Phases

### Phase 1 — Data Foundation
- [ ] Data source connectors and ingestion scripts
- [ ] Raw data storage and schema validation
- [ ] Exploratory data analysis notebook
- [ ] Data cleaning and preprocessing pipeline
- [ ] Pipeline orchestration setup

### Phase 2 — Feature Engineering & Modeling
- [ ] Feature engineering pipeline
- [ ] Baseline model training and evaluation
- [ ] Target model experimentation
- [ ] Hyperparameter tuning
- [ ] Experiment tracking integration

### Phase 3 — Productionization
- [ ] Model serialization and registry
- [ ] Serving API or batch inference pipeline
- [ ] Monitoring and alerting (data drift, model performance)
- [ ] Automated retraining pipeline
- [ ] Documentation and reproducibility checks
