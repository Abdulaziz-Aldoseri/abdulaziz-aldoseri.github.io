import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { failed: boolean };

/** Shows an honest message instead of a blank or partial decision view. */
export default class CaseErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="case-result-panel" role="alert">
          <p>
            The interactive view could not be displayed. No results have been estimated or substituted. The executive
            summary and tables on this page show the evaluated reference results, and the notebook contains every
            evaluated point.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
