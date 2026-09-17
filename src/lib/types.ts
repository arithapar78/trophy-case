// Shared shapes for data that travels between the server and the browser.
//
// Dates arrive as strings over JSON, which is why this differs from the
// Achievement type in achievements.ts.

export type AchievementJson = {
  id: string;
  title: string;
  date: string;
  category: string;
  note: string | null;
  photoPath: string | null;
  photoType: string | null;
  createdAt: string;
  updatedAt: string;
};
