export const COURSES_DATA = {
  "ENGINEERING (B.Tech)": {
    duration: 4,
    branches: [
      "Information Communication Technology", "Civil Engineering", "Automobile Engineering",
      "Mechanical Engineering", "Metallurgical Engineering", "Electrical Engineering",
      "Electronics & Communication Engineering", "Computer Engineering", "Cyber Security",
      "Information Technology", "Computer Science Engineering", "Aircraft Maintenance Engineering",
      "Aeronautical Engineering", "Aerospace Engineering"
    ]
  },
  "B.Tech (D2D)": {
    duration: 3,
    branches: [
      "Information Communication Technology", "Civil Engineering", "Automobile Engineering",
      "Mechanical Engineering", "Metallurgical Engineering", "Electrical Engineering",
      "Electronics & Communication Engineering", "Computer Engineering", "Cyber Security",
      "Information Technology", "Computer Science Engineering", "Aircraft Maintenance Engineering",
      "Aeronautical Engineering", "Aerospace Engineering"
    ]
  },
  "DIPLOMA": {
    duration: 3,
    branches: ["Civil Engineering", "Mechanical Engineering", "Electrical Engineering", "Automobile Engineering"]
  },
  "M.TECH (POSTGRADUATE)": {
    duration: 2,
    branches: [
      "CAD/CAM (Mechanical)", "Construction Project Management (Civil)", "Digital Communication (EC)",
      "Electrical Power Systems", "Industrial Metallurgy", "Structural Engineering (Civil)",
      "Data Science (Computer Engg.)", "Cyber Security"
    ]
  },
  "COMPUTER / IT": {
    branches: [
      { name: "BCA", duration: 5, specs: ["Data Science", "IT / CA", "Cyber Security", "Computer Science (ML & AI)"] },
      { name: "MCA", duration: 2, specs: ["General MCA"] }
    ]
  },
  "SCIENCE": {
    branches: [
      { name: "B.Sc", duration: 3, specs: ["Clinical Research", "Mathematics", "Physics", "Chemistry", "Microbiology"] },
      { name: "M.Sc", duration: 2, specs: ["All science specializations"] }
    ]
  },
  "MANAGEMENT / COMMERCE": {
    branches: [
      { name: "BBA", duration: 3, specs: ["General BBA"] },
      { name: "MBA", duration: 2, specs: ["HR / Finance / Marketing"] },
      { name: "B.Com (Hons.)", duration: 3, specs: ["Commerce"] }
    ]
  },
  "PHARMACY": {
    branches: [
      { name: "B.Pharm", duration: 4, specs: ["Pharmacy"] },
      { name: "B.Pharm (D2D)", duration: 3, specs: ["Pharmacy lateral entry"] },
      { name: "M.Pharm", duration: 2, specs: ["Pharmacy PG"] }
    ]
  },
  "DESIGN / ARCHITECTURE": {
    branches: [
      { name: "B.Des", duration: 4, specs: ["Interior Design", "Fashion Design", "Communication Design", "Product Design", "UI/UX Design"] },
      { name: "M.Des", duration: 2, specs: ["Design"] },
      { name: "B.Arch", duration: 5, specs: ["Architecture"] }
    ]
  },
  "BA": {
    duration: 3,
    branches: ["English Hons"]
  }
};

export const getFunkyAvatar = (seed, gender = 'all', style = 'big-smile') => {
  let params = '';
  
  if (style === 'big-smile') {
    if (gender === 'male') {
      params = '&hair=shortHair,mohawk,curlyShortHair,shavedHead';
    } else if (gender === 'female') {
      params = '&hair=bunHair,straightHair,bangs,wavyBob,curlyBob,froBun,braids';
    }
  } else if (style === 'avataaars') {
    if (gender === 'male') {
      params = '&topType=shortHair,hat,hijab';
    } else if (gender === 'female') {
      params = '&topType=longHair,bun,curly';
    }
  }
  
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed || 'default')}${params}`;
};
