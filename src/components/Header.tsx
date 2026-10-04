import type { ReactNode } from 'react';
import { useOrderSet } from '../context/OrderSetContext';
import { TOOL_LINKS } from '../data/tools';
import meeshoLogo from '../../meeshoLogo.svg';
import styles from './Header.module.css';

/**
 * `minimal` shows only the logo (used on the home launcher, where the tiles are the navigation).
 * `action` is a page-specific button shown at the far right, e.g. the engine's Guide button.
 */
export function Header({ title, minimal = false, action }: { title?: ReactNode; minimal?: boolean; action?: ReactNode }) {
  const { activeKey, setActiveKey, sets, goHome, view, openDashboard, openEngine } = useOrderSet();
  const inWorkspace = view === 'workspace';

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <button className={styles.brand} onClick={goHome} aria-label="Meesho home">
          <img src={meeshoLogo} alt="Meesho" className={styles.logo} />
        </button>
        {title ? <h1 className={styles.barTitle}>{title}</h1> : null}
        {!minimal && <nav className={styles.navigation} aria-label="Workspace">
          <button className={styles.navButton} aria-current={view === 'dashboard' ? 'page' : undefined} onClick={openDashboard}>Dashboard</button>
          <button className={styles.navButton} aria-current={inWorkspace && activeKey === 'custom' ? 'page' : undefined} onClick={openEngine}>Custom order</button>
          <select className={styles.analysisSelect} aria-label="Previous order analysis" value={inWorkspace && activeKey !== 'custom' ? activeKey : ''} onChange={(event) => setActiveKey(event.target.value)}>
            <option value="" disabled>Previous order analysis</option>
            {sets.filter((set) => set.key !== 'custom').map((set) => <option key={set.key} value={set.key}>{set.label}</option>)}
          </select>
          <div className={styles.toolLinks}>
            <a className={styles.toolLink} href={TOOL_LINKS.pds} target="_blank" rel="noopener noreferrer">PDS</a>
            <a className={styles.toolLink} href={TOOL_LINKS.verify} target="_blank" rel="noopener noreferrer">IMG Verify</a>
            <a className={styles.toolLink} href={TOOL_LINKS.rts} target="_blank" rel="noopener noreferrer">RTS</a>
          </div>
        </nav>}
        {action && <div className={styles.pageAction}>{action}</div>}
      </div>
    </header>
  );
}
