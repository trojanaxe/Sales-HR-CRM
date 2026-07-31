// Seed keyword dictionary for Resume Intelligence keyword extraction.
// This is the starting point for the "candidate learning system": every resume
// and JD parsed can grow the dictionary further via SkillKeyword records in the
// database (see learning.ts), so matching quality improves as more documents
// flow through the CRM without requiring an external NLP/LLM service.

export type KeywordCategory = "skill" | "role" | "industry" | "certification";

export const SEED_SKILLS: string[] = [
  // Languages
  "JavaScript", "TypeScript", "Python", "Java", "C#", "C++", "C", "Go", "Rust",
  "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R", "MATLAB", "Perl", "SQL",
  // Frontend
  "React", "Angular", "Vue", "Next.js", "Redux", "HTML", "CSS", "Tailwind CSS",
  "Bootstrap", "jQuery", "Webpack",
  // Backend
  "Node.js", "Express", "Django", "Flask", "FastAPI", "Spring", "Spring Boot",
  ".NET", "ASP.NET", "Ruby on Rails", "Laravel", "GraphQL", "REST API",
  "Microservices",
  // Data / Databases
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Oracle", "SQL Server", "SQLite",
  "Cassandra", "DynamoDB", "Elasticsearch", "Snowflake", "Databricks",
  "Data Warehousing", "ETL", "Apache Spark", "Apache Kafka", "Hadoop",
  "Power BI", "Tableau", "Looker",
  // Cloud / DevOps
  "AWS", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes", "Terraform",
  "Ansible", "Jenkins", "CI/CD", "GitHub Actions", "GitLab CI", "Helm",
  "CloudFormation", "Serverless",
  // Salesforce ecosystem (relevant to this CRM's staffing domain)
  "Salesforce", "Salesforce CPQ", "Apex", "Visualforce", "Lightning Web Components",
  "Salesforce Admin", "Salesforce Developer", "Marketing Cloud", "Service Cloud",
  "Sales Cloud", "MuleSoft",
  // ERP / Enterprise
  "SAP", "SAP ABAP", "SAP FICO", "SAP MM", "SAP SD", "Oracle EBS", "Workday",
  "ServiceNow", "NetSuite", "PeopleSoft",
  // Testing / QA
  "Selenium", "Cypress", "Playwright", "JUnit", "TestNG", "Postman", "Jest",
  "Manual Testing", "Automation Testing", "Performance Testing", "Load Testing",
  // Mobile
  "iOS", "Android", "React Native", "Flutter",
  // Data Science / AI
  "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "NLP",
  "Data Science", "Data Analysis", "Pandas", "NumPy", "Scikit-learn",
  // Project / Process
  "Agile", "Scrum", "Kanban", "JIRA", "Confluence", "Project Management",
  "Business Analysis", "Six Sigma", "PMP",
  // Networking / Security / Sysadmin
  "Linux", "Windows Server", "Networking", "Cybersecurity", "Penetration Testing",
  "Active Directory", "VMware", "Cisco",
  // Soft / general business skills
  "Communication", "Leadership", "Team Management", "Stakeholder Management",
  "Client Management", "Negotiation", "Presentation Skills",
];

export const SEED_ROLES: string[] = [
  "Software Engineer", "Senior Software Engineer", "Software Developer",
  "Full Stack Developer", "Frontend Developer", "Backend Developer",
  "DevOps Engineer", "Site Reliability Engineer", "Data Engineer",
  "Data Scientist", "Data Analyst", "Business Analyst", "QA Engineer",
  "Test Engineer", "Product Manager", "Project Manager", "Program Manager",
  "Scrum Master", "Solutions Architect", "Technical Architect", "Cloud Architect",
  "Salesforce Developer", "Salesforce Administrator", "Salesforce Consultant",
  "SAP Consultant", "System Administrator", "Network Engineer",
  "Security Engineer", "Machine Learning Engineer", "AI Engineer",
  "Mobile Developer", "iOS Developer", "Android Developer",
  "UI/UX Designer", "UX Designer", "Database Administrator", "DBA",
  "Engineering Manager", "Technical Lead", "Team Lead", "Delivery Manager",
  "Recruiter", "Technical Recruiter", "HR Manager", "Sales Executive",
  "Account Manager", "Customer Success Manager",
];

export const SEED_INDUSTRIES: string[] = [
  "Banking", "Financial Services", "Insurance", "Healthcare", "Pharmaceuticals",
  "Life Sciences", "Retail", "E-commerce", "Manufacturing", "Automotive",
  "Telecom", "Telecommunications", "Media", "Entertainment", "Government",
  "Public Sector", "Energy", "Utilities", "Oil and Gas", "Logistics",
  "Supply Chain", "Real Estate", "Education", "EdTech", "Travel", "Hospitality",
  "Aerospace", "Defense", "Non-Profit", "Staffing", "Consulting", "Fintech",
  "Healthtech", "SaaS", "Technology",
];

export const SEED_CERTIFICATIONS: string[] = [
  "PMP", "CSM", "Certified Scrum Master", "AWS Certified Solutions Architect",
  "AWS Certified Developer", "AWS Certified SysOps Administrator",
  "Microsoft Certified: Azure Administrator", "Azure Solutions Architect",
  "Google Cloud Professional", "Salesforce Certified Administrator",
  "Salesforce Certified Platform Developer", "CISSP", "CISM", "CompTIA Security+",
  "CCNA", "CCNP", "ITIL", "Six Sigma Green Belt", "Six Sigma Black Belt",
  "CPA", "CFA", "SAP Certified", "Oracle Certified Professional", "OCP",
  "CKA", "Certified Kubernetes Administrator", "TOGAF",
];

export function seedDictionary(): Record<KeywordCategory, string[]> {
  return {
    skill: SEED_SKILLS,
    role: SEED_ROLES,
    industry: SEED_INDUSTRIES,
    certification: SEED_CERTIFICATIONS,
  };
}
