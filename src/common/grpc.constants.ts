import { join } from 'path';

const repositoryRoot = process.env.MONOREPO_ROOT ?? join(process.cwd(), '..');

const defaultProtoPath = join(
  repositoryRoot,
  'grpc-server',
  'src',
  'protos',
  'demokratie.proto',
);

export const demokratieProtoPath = process.env.GRPC_PROTO_PATH ?? defaultProtoPath;
