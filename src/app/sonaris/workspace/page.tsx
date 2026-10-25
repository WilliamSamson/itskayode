import type { Metadata } from 'next';
import { IntegratedWorkspace } from '@/sonaris/components/workspace/integrated-workspace';

export const metadata: Metadata = {
  title: {
    absolute: 'SONARIS: Integrated Engineering Workspace',
  },
  description:
    'Authoritative digital engineering workspace for SONARIS: interactive component graph, kinematically linked subsystems, and verification environment.',
};

export default function WorkspacePage() {
  return <IntegratedWorkspace />;
}
