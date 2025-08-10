import { createFileSystemService } from '@/services/FileSystemService';
import { createGitService } from '@/services/GitService';
import { createManifestService } from '@/services/ManifestService';
import { createPackageService } from '@/services/PackageService';
import { createRegistryService } from '@/services/RegistryService';

const fileSystemService = createFileSystemService();
const gitService = createGitService();
const manifestService = createManifestService();
const packageService = createPackageService();
const registryService = createRegistryService();

const container = {
  FileSystem: fileSystemService,
  Git: gitService,
  Manifest: manifestService,
  Package: packageService,
  Registry: registryService,
};

type Container = typeof container;

export default container;
export type { Container };
