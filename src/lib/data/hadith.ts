export type HadithEntry = {
  id: string;
  collection: "bukhari" | "muslim" | "tirmidhi";
  category: "faith" | "character" | "prayer" | "knowledge";
  text: string;
  narrator: string;
  reference: string;
};

export const HADITH_DATA: HadithEntry[] = [
  {
    id: "bukhari-1",
    collection: "bukhari",
    category: "faith",
    text: "Actions are judged by intentions, and each person will receive according to what they intended.",
    narrator: "Umar ibn Al-Khattab (RA)",
    reference: "Sahih al-Bukhari 1"
  },
  {
    id: "bukhari-8",
    collection: "bukhari",
    category: "prayer",
    text: "The most beloved deeds to Allah are those done regularly, even if they are small.",
    narrator: "Aisha (RA)",
    reference: "Sahih al-Bukhari 6464"
  },
  {
    id: "muslim-55",
    collection: "muslim",
    category: "character",
    text: "None of you truly believes until he loves for his brother what he loves for himself.",
    narrator: "Anas ibn Malik (RA)",
    reference: "Sahih Muslim 45"
  },
  {
    id: "muslim-113",
    collection: "muslim",
    category: "prayer",
    text: "The five daily prayers erase sins committed between them, as long as major sins are avoided.",
    narrator: "Abu Hurairah (RA)",
    reference: "Sahih Muslim 233"
  },
  {
    id: "tirmidhi-245",
    collection: "tirmidhi",
    category: "knowledge",
    text: "Whoever treads a path seeking knowledge, Allah will make easy for him a path to Paradise.",
    narrator: "Abu Hurairah (RA)",
    reference: "Jami at-Tirmidhi 2646"
  },
  {
    id: "tirmidhi-421",
    collection: "tirmidhi",
    category: "character",
    text: "The believer who mixes with people and is patient with their harm has greater reward.",
    narrator: "Ibn Umar (RA)",
    reference: "Jami at-Tirmidhi 2507"
  }
];
