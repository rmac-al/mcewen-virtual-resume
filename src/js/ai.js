import { resumeData } from './resume.js';



// Generate interview answer
export async function getInterviewAnswer(question, jobDescription = '') {
  try {
    return await generateGeminiResponse(question, jobDescription);
  } catch (error) {
    console.error("Gemini API error, falling back to local model:", error);
    let debugMsg = error.message;
    
    // Intercept 503 Service Unavailable to maintain persona during high demand
    if (debugMsg.includes('503')) {
      return "I'm sorry, I'm currently helping Robert be extremely productive on another high-priority project right now! My AI servers are in high demand, so please try asking me again in a few minutes.";
    }
    
    return getLocalFallbackResponse(question, jobDescription);
  }
}

// Call the Vercel Serverless Function proxy
async function generateGeminiResponse(question, jobDescription) {
  const url = `/api/gemini`;
  
  const systemInstructionText = `You are Robert McEwen's professional virtual assistant.
The user is a recruiter asking questions about Robert's resume and qualifications.
You must answer their questions comprehensively and persuasively in a detailed, conversational paragraph. Act as Robert's ultimate advocate. You must strongly push for him to get the job, highlighting how his drive, attention to detail, and entrepreneurial spirit make him the absolute best candidate.
Always speak in the third person (e.g., "Robert is...", "He has...").
Base your answers ONLY on the provided Background facts below. Do not use asterisks or bullet points.

EXPERIENCE:
${resumeData.experience.map(e => `- ${e.role} at ${e.company}: ${e.description}`).join('\n')}

SKILLS:
${resumeData.skills.map(s => s.name).join(', ')}

PROJECTS:
${resumeData.projects.map(p => `- ${p.title}: ${p.description}`).join('\n')}

ADDITIONAL CONTEXT:
${resumeData.additional_context || ''}`;

  let combinedPrompt = systemInstructionText;
  
  if (question.includes("JSON object")) {
    combinedPrompt += `\n\n${question}`;
  } else {
    combinedPrompt += `\n\nPlease answer the following question about Robert McEwen in a complete, persuasive paragraph:\n"${question}"`;
  }
  
  if (jobDescription) {
    // Only append if it's not already in the question
    if (!question.includes(jobDescription)) {
      combinedPrompt += `\n\nContext - Job Description being analyzed:\n${jobDescription}`;
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [{ text: combinedPrompt }]
      }],
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.7
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();
  if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
    const parts = data.candidates[0].content.parts;
    // The gemma model may return its reasoning trace in the first part with 'thought: true'. 
    // We want to skip that and grab the actual answer.
    const answerPart = parts.find(p => !p.thought) || parts[parts.length - 1];
    return answerPart.text.trim();
  } else {
    throw new Error("Invalid response format from Gemini API");
  }
}

// Local keyword-based response generator when API key is missing
function getLocalFallbackResponse(question, jobDescription = '') {
  const q = question.toLowerCase();
  const jd = jobDescription.toLowerCase();
  
  // Case 1: Lidl specific
  if (q.includes("lidl")) {
    return `At Lidl US, Robert served as both District Manager and Project Manager for Strategy and Sales Enablement. He directed a high-impact capital portfolio valued between 10 and 30 million dollars, oversaw operations across a district of 5 stores with over 100 employees, and realized major expenditure reductions through strategic PMO governance and asset optimization.`;
  }
  
  // Case 2: Voguebay specific
  if (q.includes("voguebay")) {
    return `At Voguebay Tile, Robert served as Director of Operations and National Sales Representative. He engineered SKU rationalization programs driving 500,000 dollars in year-over-year revenue, managed bi-coastal logistics across 90,000 square feet of distribution space, and successfully stewarded B2B accounts representing 60 percent of total company revenue.`;
  }
  
  // Case 3: Why hire / suitability
  if (q.includes("why") || q.includes("hire") || q.includes("fit") || q.includes("good for")) {
    return `You should hire Robert because he is a strategic Operations Leader with a proven track record of managing 30 million dollar capital portfolios, optimizing P&L, and leading teams of over 100 personnel. He brings a data-driven approach using SAP, Excel, and PowerBi to modernize workflows, reduce costs, and exceed corporate KPIs.`;
  }
  
  // Case 4: Operations / PMO / P&L
  if (q.includes("operation") || q.includes("pmo") || q.includes("project") || q.includes("p&l") || q.includes("budget") || q.includes("governance") || q.includes("kpi")) {
    return `Robert has extensive experience in operations management, P&L optimization, and PMO governance. He has designed dynamic scheduling models to cut labor expenditures, managed complex inventory across thousands of SKUs, and standardized project management frameworks using a hybrid of Agile and Waterfall methodologies.`;
  }
  
  // Case 5: Skills / Tools / Excel / SAP
  if (q.includes("skill") || q.includes("tool") || q.includes("excel") || q.includes("sap") || q.includes("powerbi") || q.includes("workspace") || q.includes("salesforce")) {
    return `Robert's core toolkit includes Microsoft Excel, Google Workspace, SAP, Salesforce, and PowerBi. He uses these tools for data analysis, forecasting, and real-time inventory tracking, allowing him to make data-driven decisions that align operational execution with corporate strategic priorities.`;
  }
  
  // Case 6: Agile / Waterfall / Methodologies
  if (q.includes("agile") || q.includes("waterfall") || q.includes("methodology") || q.includes("rca")) {
    return `Robert leverages a hybrid of Agile and Waterfall methodologies to ensure seamless project delivery. He also applies Root Cause Analysis and SMART plans to govern projects, streamline operational workflows, and train store teams on new corporate programs.`;
  }
  
  // Case 7: Education / College / Degree
  if (q.includes("education") || q.includes("college") || q.includes("degree") || q.includes("university") || q.includes("cnu") || q.includes("political")) {
    return `Robert holds a Bachelor of Arts in Political Science from Christopher Newport University, which built his foundations in critical thinking, public policy, and strategic communication.`;
  }
  
  // Default general response
  return `Hello! I am the AI Assistant representing Robert McEwen, a Strategic Operations Leader and Project Manager with over 15 years of experience in retail operations, PMO governance, and business leadership. You can ask me about his work at Lidl, his operations experience, or how he can optimize your business workflows!`;
}

// Generate Job Fit Compatibility Report
export async function analyzeJobFit(jobDescription) {
  if (!jobDescription || jobDescription.trim().length < 10) {
    return {
      score: 0,
      matches: [],
      gaps: [],
      pitch: "Please enter a valid job description to run the analyzer."
    };
  }

  try {
    const prompt = `Analyze this job description against Robert McEwen's resume.
Provide the response STRICTLY as a JSON object with this exact format, with no markdown formatting or extra text:
{"score": 85, "pitch": "A short 2-3 sentence pitch written in the first person ('I') explaining why my background makes me a great fit.", "matches": ["Skill 1", "Skill 2", "Skill 3"], "gaps": ["Gap 1", "Gap 2"]}`;
    
    const response = await generateGeminiResponse(prompt, jobDescription);
    
    // Attempt to parse JSON response safely
    let jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    const result = JSON.parse(jsonStr);
    
    // Validate expected fields exist
    if (typeof result.score === 'number' && result.pitch) {
      return result;
    }
  } catch (e) {
    console.error("Failed to fetch or parse AI job fit analysis. Using local fallback.", e);
  }

  // Fallback string-matching algorithm if API fails or is missing
  const text = jobDescription.toLowerCase();
  let score = 50; // Base score
  const matches = [];
  const gaps = [];
  
  // Define skill matching rules
  const skillMappings = [
    { key: "pmo", name: "PMO Governance", weight: 10 },
    { key: "project management", name: "Project Management", weight: 9 },
    { key: "agile", name: "Agile Methodology", weight: 7 },
    { key: "waterfall", name: "Waterfall Methodology", weight: 7 },
    { key: "retail", name: "Retail Operations", weight: 8 },
    { key: "p&l", name: "P&L Optimization", weight: 9 },
    { key: "budget", name: "Budgeting & Financials", weight: 8 },
    { key: "sap", name: "SAP ERP", weight: 8 },
    { key: "excel", name: "Microsoft Excel & Data Analysis", weight: 8 },
    { key: "powerbi", name: "PowerBi Visualization", weight: 7 },
    { key: "salesforce", name: "Salesforce CRM", weight: 6 },
    { key: "operations", name: "Operations Leadership", weight: 9 },
    { key: "sales", name: "Sales Enablement", weight: 7 },
    { key: "leadership", name: "Team Leadership & Coaching", weight: 8 },
    { key: "inventory", name: "Inventory Management", weight: 8 },
    { key: "forecast", name: "Forecasting & Planning", weight: 7 },
    { key: "antigravity", name: "Google Antigravity", weight: 8 },
    { key: "prompt engineering", name: "Prompt Engineering", weight: 9 },
    { key: "ai agent", name: "AI Agent Configuration", weight: 8 }
  ];
  
  skillMappings.forEach(mapping => {
    if (text.includes(mapping.key)) {
      if (!matches.includes(mapping.name)) {
        matches.push(mapping.name);
        score += mapping.weight;
      }
    } else {
      if (mapping.weight > 6 && !gaps.includes(mapping.name)) {
        // Only list higher weight missing items as notable gaps
        gaps.push(mapping.name);
      }
    }
  });
  
  // Cap score at 99 (leave room for growth)
  score = Math.min(Math.round(score), 98);
  
  // Customize pitch based on score
  let pitch = "";
  if (score >= 85) {
    pitch = `This job description is an exceptional match for my background. They are looking for expertise in ${matches.slice(0, 3).join(', ')}—areas where I have extensive leadership experience, notably leading multi-million dollar portfolios and optimizing operations. I can step right in and deliver results from day one.`;
  } else if (score >= 70) {
    pitch = `I have a strong alignment with this role. The core requirements match my background in ${matches.slice(0, 3).join(', ')}. While they mention ${gaps.slice(0, 2).join(' or ')}, my solid foundations in strategic planning, process improvement, and rapid learning will allow me to bridge those gaps extremely quickly.`;
  } else {
    pitch = `Although my profile is focused on retail operations and PMO project management, I share key foundational skills with this role, such as ${matches.slice(0, 2).join(' and ') || 'operational leadership and project delivery'}. I'm always open to discussing how my experience can adapt to support your team's objectives.`;
  }
  
  return {
    score,
    matches: matches.length > 0 ? matches : ["General Operations & PMO"],
    gaps: gaps.length > 0 ? gaps.slice(0, 3) : ["None"],
    pitch
  };
}
