import { Component } from 'react';
export default class GraphicsBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="graphics-fallback" role="status">{this.props.background ? '' : '3D graphics are unavailable in this browser. Use Buyers & search to browse the directory.'}</div> : this.props.children;
  }
}
