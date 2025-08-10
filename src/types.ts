export type Source = string;
export type Version = `${number}.${number}.${number}`;

export type Package = {
  name: string;
  version: Version;
  source?: Source;
};

export type Manifest = {
  name: string;
  version: Version;
  dependencies: Record<Package['name'], Omit<Package, 'name'> | Package['version']>;
  defaultSource?: Source;
};
