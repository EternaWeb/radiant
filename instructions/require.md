The problem
›
Diagnostic losses from manual interpretation.
›
Lack of centralized archiving system.
›
Inability for cross-departmental access.
Objective
Build an Artificial Intelligence platform that:
›
Automatically analyzes and interprets medical images (X-ray, CT, MRI, ultrasound).
›
Detects anomalies and generates a diagnostic report with Risk Score.
›
Stores and archives images and reports in the patient file (PACS).
›
Enables image exchange and real-time cross-departmental access.
Primary users
›
Radiologist and diagnostic physician.
›
Physicians from other departments (surgery, cardiology, emergency).
›
Analytical and operational teams.
AI component
The model analyzes images and detects anomalies based on:
›
Patient's image history stored in PACS.
›
Deviations from the normal anatomical structure of organs.
›
Comparison with population reference images.
›
Changes between serial images of the same patient.
›
Combining imaging findings with clinical data.
System workflow
Image upload → AI analysis → PACS archiving → Cross-departmental access.
Minimum prototype
›
Image uploader with basic viewer.
›
AI model with automatic Risk Score.
›
Structured diagnostic report.
›
Automatic archiving in PACS.
›
Cross-departmental access panel.
›
Automatic notification for high Risk.
Data sources
›
NIH Chest X-Ray Dataset.
›
RSNA Pneumonia Detection Dataset.
›
VinBigData Chest X-Ray Abnormalities Dataset.
›
Generated synthetic DICOM data.
Expected outcome
Early identification of anomalies, reduction of diagnostic delay, and support for data-driven clinical decision making.