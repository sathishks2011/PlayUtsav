type MessageMap = Record<string, string>;

const loaders: Record<string, () => Promise<MessageMap>> = {
  en: () => import('../messages/en.json').then((m) => m.default),
  es: () => import('../messages/es.json').then((m) => m.default),
};

export async function loadMessages(locale: string): Promise<MessageMap> {
  const loader = loaders[locale] ?? loaders.en;
  return loader();
}

