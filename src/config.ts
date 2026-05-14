
export interface Subject {
  id: string;
  name: string;
  midtermWeight: number;
  finalWeight: number;
  performanceWeight: number;
}

export interface Config {
  schoolName: string;
  grade: string;
  primaryColor: string;
  secondaryColor: string;
  subjects: Subject[];
  notices: {
    id: string;
    title: string;
    date: string;
    content: string;
  }[];
}

export const APP_CONFIG: Config = {
  schoolName: "여수고등학교",
  grade: "2학년",
  primaryColor: "#1e3a8a", // navy-900
  secondaryColor: "#3b82f6", // blue-500
  subjects: [
    { id: "lit", name: "문학", midtermWeight: 30, finalWeight: 30, performanceWeight: 40 },
    { id: "alg", name: "대수", midtermWeight: 30, finalWeight: 30, performanceWeight: 40 },
    { id: "pst", name: "확률과통계", midtermWeight: 30, finalWeight: 30, performanceWeight: 40 },
    { id: "eng1", name: "영어Ⅰ", midtermWeight: 30, finalWeight: 30, performanceWeight: 40 },
    { id: "bio", name: "생명과학", midtermWeight: 30, finalWeight: 30, performanceWeight: 40 },
    { id: "earth", name: "지구과학", midtermWeight: 30, finalWeight: 30, performanceWeight: 40 },
    { id: "whist", name: "세계사", midtermWeight: 30, finalWeight: 30, performanceWeight: 40 },
    { id: "soc", name: "사회와문화", midtermWeight: 30, finalWeight: 30, performanceWeight: 40 },
    { id: "chi", name: "중국어", midtermWeight: 30, finalWeight: 30, performanceWeight: 40 },
    { id: "jap", name: "일본어", midtermWeight: 30, finalWeight: 30, performanceWeight: 40 },
  ],
  notices: []
};
