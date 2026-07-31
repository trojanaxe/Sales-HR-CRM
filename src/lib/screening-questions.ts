export interface ScreeningQuestion {
  id: string;
  question: string;
}

export interface ScreeningSection {
  id: string;
  title: string;
  questions: ScreeningQuestion[];
}

export const SCREENING_SECTIONS: ScreeningSection[] = [
  {
    id: "basic_profile",
    title: "Basic Profile",
    questions: [
      { id: "total_exp", question: "Total years of experience?" },
      {
        id: "current_designation",
        question: "Current designation and company?",
      },
      {
        id: "current_location",
        question: "Current location — are you open to relocation?",
      },
      {
        id: "currently_working",
        question: "Are you currently working or serving notice?",
      },
      {
        id: "engagement_type",
        question:
          "What type of engagement are you looking for — full-time, contract, or both?",
      },
    ],
  },
  {
    id: "compensation",
    title: "Compensation",
    questions: [
      {
        id: "current_ctc",
        question: "Current CTC (fixed + variable breakdown)?",
      },
      { id: "expected_ctc", question: "Expected CTC?" },
      {
        id: "appraisal_cycle",
        question:
          "Are you currently on any performance cycle or appraisal due?",
      },
      {
        id: "joining_bonus",
        question: "Any joining bonus or retention bonus that needs to be bought out?",
      },
    ],
  },
  {
    id: "availability",
    title: "Availability",
    questions: [
      { id: "notice_period", question: "Notice period?" },
      {
        id: "notice_negotiable",
        question: "Is the notice period negotiable or can it be shortened?",
      },
      {
        id: "last_working_day",
        question: "Last working day if already resigned?",
      },
      {
        id: "earliest_joining",
        question: "Earliest possible date of joining?",
      },
    ],
  },
  {
    id: "certifications",
    title: "Certifications & Education",
    questions: [
      { id: "highest_qualification", question: "Highest qualification?" },
      {
        id: "relevant_certs",
        question: "Any relevant certifications you currently hold?",
      },
      {
        id: "certs_in_progress",
        question: "Are any certifications in progress or planned?",
      },
      {
        id: "certs_active",
        question: "Are certifications active or expired?",
      },
    ],
  },
  {
    id: "technical_general",
    title: "Technical Skills — General",
    questions: [
      { id: "primary_stack", question: "What is your primary tech stack?" },
      {
        id: "programming_langs",
        question: "Which programming languages are you most comfortable with?",
      },
      {
        id: "cloud_exp",
        question:
          "Do you have experience with cloud platforms — AWS, Azure, GCP?",
      },
      {
        id: "api_exp",
        question: "Have you worked on API integrations — REST or SOAP?",
      },
      {
        id: "cicd_exp",
        question: "Do you have experience with CI/CD pipelines or DevOps tools?",
      },
      {
        id: "db_exp",
        question:
          "Have you worked with any databases — SQL, NoSQL, MySQL, PostgreSQL?",
      },
      {
        id: "git_exp",
        question: "Do you have experience with version control tools like Git?",
      },
    ],
  },
  {
    id: "salesforce",
    title: "Salesforce Specific",
    questions: [
      {
        id: "sf_years",
        question: "How many years of Salesforce experience do you have?",
      },
      {
        id: "sf_clouds",
        question:
          "Which Salesforce Clouds have you worked on — Sales, Service, Experience, Marketing, CPQ?",
      },
      {
        id: "sf_admin_years",
        question: "How many years of Salesforce Administration experience?",
      },
      {
        id: "apex_lwc",
        question: "Do you have hands-on experience with Apex and LWC development?",
      },
      {
        id: "sf_flow",
        question:
          "Have you worked on Salesforce Flow and Process Automation?",
      },
      {
        id: "sf_integrations",
        question:
          "Do you have experience with Salesforce integrations using REST/SOAP APIs?",
      },
      {
        id: "third_party_api",
        question:
          "Have you worked with any third-party API integrations within Salesforce?",
      },
      {
        id: "data_migration",
        question: "Have you worked on data migration or ETL processes?",
      },
      {
        id: "sf_devops",
        question:
          "Have you used Salesforce DevOps tools — Copado, Gearset, Change Sets?",
      },
    ],
  },
  {
    id: "other_tech",
    title: "Other Tech Roles",
    questions: [
      {
        id: "php_frameworks",
        question:
          "For PHP/Backend: Which frameworks — Laravel, CodeIgniter, Symfony? Experience with microservices or serverless?",
      },
      {
        id: "frontend_frameworks",
        question:
          "For Frontend: Which frameworks — React, Angular, Vue? Experience with responsive design?",
      },
      {
        id: "data_bi_tools",
        question:
          "For Data/Analytics: Which BI tools — Power BI, Tableau, Looker? Python or R experience?",
      },
      {
        id: "devops_tools",
        question:
          "For DevOps: Which CI/CD tools? Experience with Docker, Kubernetes?",
      },
    ],
  },
  {
    id: "project_domain",
    title: "Project & Domain Experience",
    questions: [
      {
        id: "recent_project",
        question: "Walk me through your most recent or relevant project?",
      },
      {
        id: "role_contribution",
        question:
          "What was your specific role and contribution in that project?",
      },
      {
        id: "industries",
        question: "What industries or domains have you worked in?",
      },
      {
        id: "intl_clients",
        question: "Have you worked with US, UK, or international clients?",
      },
      {
        id: "regulated_industries",
        question:
          "Have you worked in regulated industries — pharma, healthcare, finance, manufacturing, semiconductor?",
      },
      {
        id: "product_vs_service",
        question:
          "Have you worked in a product-based or service-based environment?",
      },
      {
        id: "team_size",
        question: "What was the team size you worked with or managed?",
      },
    ],
  },
  {
    id: "leadership_soft",
    title: "Leadership & Soft Skills",
    questions: [
      {
        id: "led_team",
        question: "Have you led or mentored a team? If yes, how many members?",
      },
      {
        id: "agile_scrum",
        question:
          "Are you comfortable working in Agile/Scrum environments?",
      },
      {
        id: "client_interaction",
        question:
          "Have you directly interacted with clients or business stakeholders?",
      },
      {
        id: "time_zones",
        question:
          "Are you comfortable working in different time zones — US shift, UK shift?",
      },
      {
        id: "priorities",
        question: "How do you handle multiple priorities or tight deadlines?",
      },
    ],
  },
  {
    id: "work_preferences",
    title: "Work Preferences",
    questions: [
      {
        id: "work_mode",
        question: "Are you open to remote, hybrid, or on-site work?",
      },
      { id: "preferred_location", question: "Any preferred work location?" },
      {
        id: "startup_vs_enterprise",
        question:
          "Have you worked with startups or large enterprises — which do you prefer?",
      },
      {
        id: "other_interviews",
        question: "Are you interviewing elsewhere — any offers in hand?",
      },
      {
        id: "reason_for_change",
        question: "What is your primary reason for looking for a change?",
      },
    ],
  },
  {
    id: "closing",
    title: "Closing",
    questions: [
      {
        id: "candidate_questions",
        question: "Any questions from your side at this stage?",
      },
      {
        id: "proceed_next_round",
        question: "Is it okay if we proceed to the next round?",
      },
      {
        id: "share_docs",
        question:
          "Are you comfortable sharing your latest resume and any relevant documents?",
      },
      {
        id: "contact_mode",
        question:
          "Best time and mode to reach you for future communication?",
      },
    ],
  },
];
