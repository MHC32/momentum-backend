# Momentum MVP - Plan d'Implémentation Progressive

## Vue d'ensemble

Ce plan définit l'implémentation progressive du backend Momentum basé sur les wireframes MVP.
L'objectif est de livrer des fonctionnalités utilisables à chaque phase.

---

## État Actuel du Backend

### Déjà Implémenté (Prêt à utiliser)
- [x] **Auth** - Login, register, JWT, passwords
- [x] **Tasks** - CRUD complet, Kanban, statuts, priorités
- [x] **Projects** - CRUD, progress, types (dev/personal/book)
- [x] **Goals** - Modèle complet avec hiérarchie (routes partielles)
- [x] **Dashboard** - Stats basiques, focus, activité
- [x] **Webhooks** - GitHub (commits liés aux tasks)

### Modèles existants SANS routes API
- [x] Habit.model.js
- [x] Commit.model.js
- [x] Pomodoro.model.js
- [x] Reminder.model.js
- [x] WeeklyReview.model.js
- [x] Badge.model.js
- [x] Activity.model.js

---

## Architecture des Phases

```
PHASE 1 (Core MVP)          PHASE 2 (Productivité)      PHASE 3 (Insights)
─────────────────────       ─────────────────────       ─────────────────────
├── Goals Annuels ★         ├── Habits                  ├── Weekly Review
├── Goals Perso ★           ├── Pomodoro                ├── Analytics
├── Commits Tracker         ├── Timeline/Activity       ├── Gamification
└── Dashboard enrichi       └── Rappels                 └── Export PDF
```

★ = Obligatoire selon les spécifications

---

## PHASE 1: Core MVP (Objectifs & Suivi)

### Objectif
Permettre à l'utilisateur de définir ses objectifs annuels, les suivre quotidiennement, et tracker ses commits.

### 1.1 Goals - Compléter les routes existantes

**Fichiers à modifier:**
- `src/routes/goal.routes.js`
- `src/controllers/goal.controller.js`

**Endpoints à vérifier/compléter:**

```javascript
// Objectifs Annuels (hiérarchie complète)
GET    /api/goals/annual?year=2026&category=financial
GET    /api/goals/quarterly/:quarter?year=2026
GET    /api/goals/monthly/:month?year=2026
GET    /api/goals/weekly/:week?year=2026
GET    /api/goals/daily?date=2026-01-19

// CRUD
POST   /api/goals                    // Créer objectif
GET    /api/goals/:id                // Détail objectif
PUT    /api/goals/:id                // Modifier objectif
DELETE /api/goals/:id                // Supprimer objectif

// Progression
PUT    /api/goals/:id/progress       // Mettre à jour progression (numeric)
PUT    /api/goals/:id/steps/:stepId/complete  // Toggle step (steps type)

// Objectifs Perso (niveau=personal)
GET    /api/goals/personal           // Liste objectifs perso

// Stats
GET    /api/goals/stats?year=2026    // Statistiques globales
```

**Données retournées (exemple Annual):**
```javascript
{
  goals: [{
    _id, title, type, category, level,
    target_value, current_value, unit,
    progress, status,  // on-track, at-risk, behind, completed
    deadline, daysRemaining,
    breakdown: { perMonth, perWeek, perDay },
    integration: { type, connected },  // commits, rise_savings, etc.
    children_count  // nombre de sous-objectifs
  }],
  summary: {
    total: 4,
    onTrack: 2,
    atRisk: 1,
    behind: 1
  }
}
```

### 1.2 Commits Tracker - Nouvelles routes

**Fichiers à créer:**
- `src/routes/commit.routes.js`
- `src/controllers/commit.controller.js`
- `src/validators/commit.validator.js`

**Endpoints:**

```javascript
// Stats par période
GET    /api/commits/stats?year=2026
// Retourne: annual, monthly, weekly, daily stats avec targets et progress

// Commits du jour (timeline)
GET    /api/commits/today
// Retourne: sessions groupées par heure avec projet

// Historique paginé
GET    /api/commits?page=1&limit=10&project=xxx&startDate=&endDate=
// Retourne: liste paginée avec projet et description

// Insights
GET    /api/commits/insights?year=2026
// Retourne: dailyAverage, bestDay, currentStreak, topProject, peakHours, projection

// Logger manuellement
POST   /api/commits
// Body: { project_id, count, message, timestamp? }

// Modifier/Supprimer
PUT    /api/commits/:id
DELETE /api/commits/:id
```

**Données Stats:**
```javascript
{
  annual: {
    year: 2026,
    target: 4000,
    current: 1247,
    percentage: 31.2,
    trend: { value: 45, label: "+45 cette semaine", direction: "up" }
  },
  monthly: {
    month: 1,
    name: "Janvier",
    target: 333,  // 4000/12
    current: 83,
    percentage: 24.9,
    status: "on-track"
  },
  weekly: {
    week: 1,
    target: 77,  // 4000/52
    current: 21,
    percentage: 27.3,
    avgPerDay: 3
  },
  daily: {
    date: "2026-01-19",
    target: 11,  // 4000/365
    current: 14,
    exceeded: true
  }
}
```

### 1.3 Dashboard - Enrichir

**Fichier à modifier:**
- `src/controllers/dashboard.controller.js`

**Enrichissements:**

```javascript
// GET /api/dashboard (enrichi)
{
  user: { name, greeting },

  // Focus du jour - tâches critiques + habits à risque
  focusOfTheDay: {
    count: 3,
    items: [
      { type: "task", ...taskData, deadlineLabel: "Aujourd'hui" },
      { type: "task", ...taskData, estimatedTime: "3h" },
      { type: "habit", name: "Cours d'anglais", missedDays: 3, streakAtRisk: true }
    ]
  },

  // Stats avec trends
  stats: {
    commitsThisWeek: { value: 23, trend: "+18%", direction: "up" },
    tasksCompleted: { value: 12, trend: "+25%", direction: "up" },
    activeProjects: { value: 5, trend: "Stable", direction: "stable" },
    productivity: { value: 87, unit: "%", trend: "+5%", direction: "up" }
  },

  // Projets actifs avec enrichissement
  activeProjects: [
    { _id, name, icon, color, progress, taskCount, commitCount }
  ],

  // Activité récente (dernières 5)
  recentActivity: [
    { type, title, detail, project?, timeAgo, timestamp }
  ],

  // Objectif principal du jour (lié aux goals)
  dailyGoalHighlight: {
    title: "11+ commits aujourd'hui",
    current: 14,
    target: 11,
    exceeded: true,
    linkedGoal: { _id, title: "4000 commits 2026" }
  }
}
```

---

## PHASE 2: Productivité Quotidienne

### Objectif
Ajouter les outils de productivité quotidienne: habits, pomodoro, timeline, rappels.

### 2.1 Habits

**Fichiers à créer:**
- `src/routes/habit.routes.js`
- `src/controllers/habit.controller.js`
- `src/validators/habit.validator.js`

**Endpoints:**

```javascript
// CRUD
GET    /api/habits                   // Liste avec calendar 2 semaines
POST   /api/habits                   // Créer habit
GET    /api/habits/:id               // Détail avec historique complet
PUT    /api/habits/:id               // Modifier
DELETE /api/habits/:id               // Supprimer (archive)

// Actions quotidiennes
POST   /api/habits/:id/log           // Marquer fait/skip/missed
// Body: { date, status: "done"|"skip"|"missed", note? }

GET    /api/habits/:id/calendar?start=&end=  // Calendrier période
GET    /api/habits/:id/stats         // Statistiques

// Raccourcis
GET    /api/habits/today             // Habits à faire aujourd'hui
GET    /api/habits/at-risk           // Streaks en danger
```

**Données Liste:**
```javascript
{
  habits: [{
    _id, name, icon, goal_type, goal_frequency,
    current_streak, record_streak,
    statistics: { totalCompleted, completionRate, lastCompleted },

    // Calendrier 2 semaines (14 jours)
    calendar: [
      { date: "2026-01-05", status: "done", note: "Leçon 12" },
      { date: "2026-01-06", status: "missed" },
      { date: "2026-01-07", status: null }  // futur ou aujourd'hui
    ],

    // Alertes
    alerts: {
      streakAtRisk: true,
      missedConsecutive: 3,
      message: "Tu as manqué 3 jours! Streak en danger!"
    },

    // Aujourd'hui
    today: {
      date: "2026-01-19",
      status: null,  // pas encore fait
      isDue: true
    }
  }]
}
```

### 2.2 Pomodoro

**Fichiers à créer:**
- `src/routes/pomodoro.routes.js`
- `src/controllers/pomodoro.controller.js`

**Endpoints:**

```javascript
// Sessions
GET    /api/pomodoros/today          // Sessions du jour
POST   /api/pomodoros/start          // Démarrer session
// Body: { type: "work"|"short-break"|"long-break", duration, task_id? }

PATCH  /api/pomodoros/:id/complete   // Terminer session
// Body: { completed: true, interrupted: false }

PATCH  /api/pomodoros/:id/interrupt  // Interrompre

// Stats
GET    /api/pomodoros/stats?period=day|week|month
```

### 2.3 Activity/Timeline

**Fichiers à créer:**
- `src/routes/activity.routes.js`
- `src/controllers/activity.controller.js`

**Endpoints:**

```javascript
GET    /api/activity?limit=20&type=&project=
// Types: commit, task-completed, goal-achieved, habit-completed, pomodoro-completed

GET    /api/activity/heatmap?weeks=4
// Retourne grille avec levels 0-4

GET    /api/activity/stats?period=week
// Stats de la période
```

### 2.4 Rappels

**Fichiers à créer:**
- `src/routes/reminder.routes.js`
- `src/controllers/reminder.controller.js`

**Endpoints:**

```javascript
GET    /api/reminders?unread=true    // Liste groupée par type
PATCH  /api/reminders/:id/read       // Marquer lu
PATCH  /api/reminders/:id/dismiss    // Ignorer
POST   /api/reminders/mark-all-read  // Tout marquer lu

// Auto-génération (service interne)
// - Deadlines qui approchent
// - Streaks en danger
// - Projets pas touchés depuis X jours
// - Suggestions productivité
```

---

## PHASE 3: Insights & Motivation

### Objectif
Ajouter les outils d'analyse et de motivation.

### 3.1 Weekly Review

**Fichiers à créer:**
- `src/routes/review.routes.js`
- `src/controllers/review.controller.js`

**Endpoints:**

```javascript
GET    /api/reviews/current          // Review semaine en cours
GET    /api/reviews/weekly?year=2026&week=1
GET    /api/reviews/:id

POST   /api/reviews/generate         // Générer review (calculs)
PUT    /api/reviews/:id              // Sauvegarder notes

POST   /api/reviews/:id/plan         // Planifier semaine suivante
// Body: { selectedTasks: [], newTasks: [] }

GET    /api/reviews/:id/export       // Export PDF (URL)
```

### 3.2 Analytics

**Fichiers à créer:**
- `src/routes/analytics.routes.js`
- `src/controllers/analytics.controller.js`

**Endpoints:**

```javascript
GET    /api/analytics?period=week|month|year
// Retourne: completionRate, timeByProject, peakProductivity, trends

GET    /api/analytics/productivity-trend?days=30
// Données pour graphique évolution
```

### 3.3 Gamification

**Fichiers à créer:**
- `src/routes/gamification.routes.js`
- `src/controllers/gamification.controller.js`

**Endpoints:**

```javascript
GET    /api/users/me/gamification
// Retourne: level, xp, badges unlocked/locked

GET    /api/badges                   // Tous les badges possibles
GET    /api/badges/unlocked          // Badges de l'utilisateur

GET    /api/challenges/weekly        // Défis de la semaine
POST   /api/challenges/:id/claim     // Réclamer récompense
```

---

## Ordre d'Implémentation Détaillé

### PHASE 1 - Semaine 1-2

```
Jour 1-2: Goals
├── Vérifier/compléter goal.controller.js
├── Tester tous les endpoints hiérarchiques
├── Ajouter calculs breakdown (perMonth, perDay)
└── Ajouter daysRemaining, status auto

Jour 3-4: Commits Tracker
├── Créer commit.routes.js
├── Créer commit.controller.js
├── Implémenter stats, today, insights
├── Implémenter CRUD manuel
└── Créer commit.validator.js

Jour 5: Dashboard enrichi
├── Ajouter focusOfTheDay avec habits
├── Ajouter trends aux stats
├── Ajouter dailyGoalHighlight
└── Tests intégration
```

### PHASE 2 - Semaine 3-4

```
Jour 1-2: Habits
├── Créer routes/controllers/validators
├── Implémenter calendar 2 semaines
├── Implémenter log quotidien
├── Ajouter alertes streakAtRisk
└── Intégrer avec Dashboard focusOfTheDay

Jour 3: Pomodoro
├── Créer routes/controllers
├── Implémenter start/complete/interrupt
├── Implémenter stats
└── Optionnel: lier aux tasks

Jour 4: Activity/Timeline
├── Créer routes/controllers
├── Implémenter liste avec filtres
├── Implémenter heatmap
└── Intégrer logging auto (hooks mongoose)

Jour 5: Rappels
├── Créer routes/controllers
├── Implémenter CRUD rappels
├── Créer service auto-génération
└── Tests intégration Phase 2
```

### PHASE 3 - Semaine 5-6

```
Jour 1-2: Weekly Review
├── Créer routes/controllers
├── Implémenter generate (agrégations)
├── Implémenter plan semaine suivante
└── Optionnel: export PDF

Jour 3: Analytics
├── Créer routes/controllers
├── Implémenter stats période
├── Implémenter productivity trend
└── Optimiser requêtes (indexes)

Jour 4-5: Gamification
├── Créer routes/controllers
├── Implémenter badges
├── Créer service attribution auto
├── Implémenter challenges hebdo
└── Tests intégration Phase 3
```

---

## Dépendances entre Modules

```
Goals ─────────────┐
                   ├──► Dashboard
Commits ───────────┤
                   │
Habits ────────────┼──► Rappels (streaks en danger)
                   │
Tasks ─────────────┼──► Activity (logging)
                   │
Pomodoro ──────────┘

Activity ──────────┬──► Analytics
                   │
WeeklyReview ◄─────┴──► Gamification (achievements)
```

---

## Checklist de Validation par Phase

### Phase 1 - Critères de succès
- [ ] GET /api/goals/annual retourne les objectifs avec progress et status
- [ ] GET /api/goals/daily retourne le focus du jour
- [ ] PUT /api/goals/:id/progress met à jour et propage vers parents
- [ ] GET /api/commits/stats retourne annual/monthly/weekly/daily
- [ ] POST /api/commits crée un commit manuel
- [ ] GET /api/dashboard retourne focusOfTheDay enrichi

### Phase 2 - Critères de succès
- [ ] GET /api/habits retourne calendar 2 semaines avec alertes
- [ ] POST /api/habits/:id/log met à jour le streak
- [ ] GET /api/pomodoros/today retourne les sessions
- [ ] GET /api/activity retourne timeline avec heatmap
- [ ] GET /api/reminders retourne rappels groupés

### Phase 3 - Critères de succès
- [ ] GET /api/reviews/current génère le bilan automatique
- [ ] GET /api/analytics retourne stats avec trends
- [ ] GET /api/users/me/gamification retourne level/badges

---

## Notes Techniques

### Indexes MongoDB à ajouter
```javascript
// Commits - requêtes fréquentes par période
db.commits.createIndex({ user: 1, timestamp: -1 })
db.commits.createIndex({ user: 1, project: 1, timestamp: -1 })

// Activity - timeline et heatmap
db.activities.createIndex({ user: 1, timestamp: -1 })
db.activities.createIndex({ user: 1, type: 1, timestamp: -1 })

// Habits - calendar queries
db.habits.createIndex({ user: 1, "calendar.date": 1 })
```

### Services à créer
```
src/services/
├── commit.service.js      // Stats, insights, projections
├── habit.service.js       // Streak calculation, alerts
├── activity.service.js    // Auto-logging, heatmap generation
├── reminder.service.js    // Auto-generation de rappels
├── review.service.js      // Weekly aggregations
├── analytics.service.js   // Stats calculations
└── gamification.service.js // Badge attribution, XP calculation
```

---

## Prochaine Étape

Commencer par **Phase 1 - Goals** : Vérifier et compléter les endpoints existants dans `goal.controller.js`.

Confirme quand tu es prêt à démarrer!
