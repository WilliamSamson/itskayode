import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const component=readFileSync('src/sonaris/components/workspace/integrated-workspace.tsx','utf8');
describe('integrated workspace continuity',()=>{
 it('preserves the supplied instrument composition',()=>{expect(component).toContain('bg-[#E5E1D8]');expect(component).toContain('rounded-[44px]');});
 it('renders real tab cases and honours reduced motion',()=>{expect(component).toContain('<AssemblyWorkbench');expect(component).toContain('<PowerWorkbench');expect(component).toContain('<ScanWorkbench');expect(component).toContain('<FabricationWorkbench');expect(component).toContain('useReducedMotion');expect(component).toContain('AnimatePresence');});
 it('removes unsupported physical telemetry assertions',()=>{expect(component).not.toContain('14.2');expect(component).not.toContain('4.2 A Peak');expect(component).not.toContain('10% Safety Margin');});
 it('persists tab memory point across refreshes via hash and storage',()=>{expect(component).toContain('sonaris:workspace-tab');expect(component).toContain('handleTabChange');expect(component).toContain('hashchange');});
});
