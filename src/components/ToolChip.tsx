import type { Tool } from '../data/types';
import styles from './ToolChip.module.css';

export function ToolChip({ tool }: { tool: Tool }) {
  return (
    <span className={styles.chip}>
      {tool.code} · {tool.name}
    </span>
  );
}
