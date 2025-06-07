/**
 * ZetrixConnectSimple - A simple wallet connection component for Zetrix
 * This file provides a plain JavaScript implementation without framework dependencies
 */

import { 
  initZetrix,
  connectWallet,
  disconnectWallet,
  getAccount,
  getIsConnected,
  on
} from '../lib/zetrixSdk.js';

// Class for managing Zetrix wallet connection
export class ZetrixConnect {
  constructor(elementId) {
    this.elementId = elementId;
    this.isLoading = false;
    this.error = '';
    this.account = null;
    this.isConnected = false;
    
    // Initialize the connection
    this.init();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  // Initialize the wallet connection
  async init() {
    try {
      this.setLoading(true);
      await initZetrix();
      this.updateState();
    } catch (error) {
      this.setError('Failed to initialize Zetrix: ' + error.message);
      console.error(error);
    } finally {
      this.setLoading(false);
    }
  }
  
  // Set up event listeners for account changes
  setupEventListeners() {
    on('accountsChanged', (accounts) => {
      this.updateState();
    });
    
    on('disconnect', () => {
      this.updateState();
    });
  }
  
  // Update component state based on wallet connection
  updateState() {
    this.account = getAccount();
    this.isConnected = getIsConnected();
    this.render();
  }
  
  // Handle wallet connection
  async handleConnect() {
    try {
      this.setLoading(true);
      this.setError('');
      await connectWallet();
      this.updateState();
    } catch (error) {
      this.setError('Failed to connect: ' + error.message);
      console.error(error);
    } finally {
      this.setLoading(false);
    }
  }
  
  // Handle wallet disconnection
  async handleDisconnect() {
    try {
      this.setLoading(true);
      this.setError('');
      await disconnectWallet();
      this.updateState();
    } catch (error) {
      this.setError('Failed to disconnect: ' + error.message);
      console.error(error);
    } finally {
      this.setLoading(false);
    }
  }
  
  // Set loading state
  setLoading(isLoading) {
    this.isLoading = isLoading;
    this.render();
  }
  
  // Set error message
  setError(message) {
    this.error = message;
    this.render();
  }
  
  // Get truncated address for display
  getTruncatedAddress() {
    if (!this.account) return '';
    return this.account.substring(0, 6) + '...' + this.account.substring(this.account.length - 4);
  }
  
  // Render the component
  render() {
    const container = document.getElementById(this.elementId);
    if (!container) return;
    
    let html = '<div class="wallet-connect">';
    
    if (this.isLoading) {
      html += `
        <div class="loading">
          <span class="loader"></span>
        </div>
      `;
    } else if (this.isConnected) {
      html += `
        <div class="connected">
          <span class="address">${this.getTruncatedAddress()}</span>
          <button id="disconnect-btn" class="disconnect-btn">Disconnect</button>
        </div>
      `;
    } else {
      html += `
        <button id="connect-btn" class="connect-btn">
          Connect Zetrix Wallet
        </button>
      `;
    }
    
    if (this.error) {
      html += `
        <div class="error">
          ${this.error}
        </div>
      `;
    }
    
    html += '</div>';
    
    container.innerHTML = html;
    
    // Add event listeners to buttons
    if (this.isConnected) {
      const disconnectBtn = document.getElementById('disconnect-btn');
      if (disconnectBtn) {
        disconnectBtn.addEventListener('click', () => this.handleDisconnect());
      }
    } else {
      const connectBtn = document.getElementById('connect-btn');
      if (connectBtn) {
        connectBtn.addEventListener('click', () => this.handleConnect());
      }
    }
  }
  
  // Add this component to the DOM
  static init(elementId) {
    // Add styles to document
    const style = document.createElement('style');
    style.textContent = `
      .wallet-connect {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1rem;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.05);
        margin-bottom: 1rem;
      }
      
      .connected {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .address {
        font-family: monospace;
        background: rgba(0, 0, 0, 0.1);
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-size: 0.9rem;
      }
      
      .connect-btn, .disconnect-btn {
        padding: 0.5rem 1.25rem;
        border-radius: 20px;
        border: none;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .connect-btn {
        background: linear-gradient(45deg, #3b82f6, #2563eb);
        color: white;
      }
      
      .disconnect-btn {
        background: rgba(255, 255, 255, 0.1);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.3);
      }
      
      .connect-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
      }
      
      .disconnect-btn:hover {
        background: rgba(239, 68, 68, 0.1);
      }
      
      .loading {
        display: flex;
        justify-content: center;
        padding: 0.5rem;
      }
      
      .loader {
        width: 24px;
        height: 24px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: #3b82f6;
        animation: spin 1s ease-in-out infinite;
      }
      
      .error {
        color: #ef4444;
        margin-top: 0.5rem;
        font-size: 0.8rem;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    
    return new ZetrixConnect(elementId);
  }
}

// Usage example:
// document.addEventListener('DOMContentLoaded', () => {
//   ZetrixConnect.init('zetrix-wallet-container');
// }); 