export type KnowledgeEntry = {
  id: string;
  section: string;
  route: string;
  title: string;
  keywords: string[];
  answer: string;
  steps?: string[];
  roles?: string;
};

export type NoaNavigation = {
  label: string;
  route: string;
};
