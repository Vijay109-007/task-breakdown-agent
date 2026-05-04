# 🤖 AI-Driven Agile Task Management System

## 📌 Overview
This project is an AI-powered Agile workflow system that:

- Breaks down a project into tasks
- Manages dependencies between tasks
- Assigns tasks to team members intelligently
- Tracks task lifecycle (READY → IN_PROGRESS → DONE)
- Detects bottlenecks
- Automatically rebalances workload using AI

---

## 🚀 Features

### 🧠 AI Task Breakdown
- Converts project goal into structured Agile tasks

### 🔗 Dependency Management
- Ensures tasks follow logical execution order

### 👥 Smart Task Assignment
- Assigns tasks based on:
  - skills
  - role
  - workload
  - capacity

### 🔄 Task Lifecycle
- READY → IN_PROGRESS → DONE

### 📊 Workload Monitoring
- Detects overloaded and underutilized team members

### 🔁 AI Rebalancing
- Automatically reassigns tasks to optimize team performance

---

## 🏗️ Architecture

```text
prompt.js     → Task generation (AI planning)
decision.js   → AI decision engine
page.js       → Workflow execution engine
team.js       → Team configuration