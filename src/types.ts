import { z } from 'zod';

export const SourceSchema = z.string();

export const VersionSchema = z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in format x.y.z');

export const PackageSchema = z.object({
  name: z.string().min(1, 'Package name cannot be empty'),
  version: VersionSchema,
  source: SourceSchema.optional(),
});

export const ManifestSchema = z.object({
  $schema: z.string().optional(),
  name: z.string().min(1, 'Manifest name cannot be empty'),
  version: VersionSchema,
  dependencies: z.record(z.string(), z.union([PackageSchema.omit({ name: true }), VersionSchema])),
  defaultSource: SourceSchema.optional(),
});

export type Source = z.infer<typeof SourceSchema>;
export type Version = z.infer<typeof VersionSchema>;
export type Package = z.infer<typeof PackageSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
