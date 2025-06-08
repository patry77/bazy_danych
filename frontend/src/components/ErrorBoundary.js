import React from 'react';
import styled from 'styled-components';

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  color: white;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const ErrorIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 2rem;
  animation: bounce 2s ease-in-out infinite;
  
  @keyframes bounce {
    0%, 20%, 53%, 80%, 100% {
      transform: translate3d(0, 0, 0);
    }
    40%, 43% {
      transform: translate3d(0, -10px, 0);
    }
    70% {
      transform: translate3d(0, -5px, 0);
    }
    90% {
      transform: translate3d(0, -2px, 0);
    }
  }
`;

const ErrorTitle = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
`;

const ErrorMessage = styled.p`
  font-size: 1.1rem;
  opacity: 0.9;
  margin-bottom: 2rem;
  max-width: 600px;
  line-height: 1.6;
`;

const ErrorDetails = styled.details`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  margin: 20px 0;
  max-width: 800px;
  text-align: left;
  
  summary {
    cursor: pointer;
    font-weight: 600;
    margin-bottom: 10px;
    
    &:hover {
      opacity: 0.8;
    }
  }
  
  pre {
    background: rgba(0, 0, 0, 0.2);
    padding: 10px;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 0.9rem;
    white-space: pre-wrap;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  justify-content: center;
`;

const ActionButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const TechnicalInfo = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 15px;
  margin-top: 20px;
  font-size: 0.9rem;
  opacity: 0.8;
  max-width: 600px;
`;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.setState({
      error: error,
      errorInfo: errorInfo,
      errorId: errorId
    });

    console.group('🚨 Error Boundary Caught Error');
    console.error('Error ID:', errorId);
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo?.componentStack);
    console.groupEnd();

    this.reportError(error, errorInfo, errorId);
  }
  reportError = (error, errorInfo, errorId) => {
    const errorReport = {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.log('Error Report:', errorReport);
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null 
    });
  };

  handleReportBug = () => {
    const subject = encodeURIComponent(`Bug Report - Error ID: ${this.state.errorId}`);
    const body = encodeURIComponent(`
Error ID: ${this.state.errorId}
Error Message: ${this.state.error?.message}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}

Steps to reproduce:
1. 
2. 
3. 

Additional context:

    `);
    
    window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorContainer>
          <ErrorIcon>💥</ErrorIcon>
          <ErrorTitle>Ups! Coś poszło nie tak</ErrorTitle>
          <ErrorMessage>
            Wystąpił nieoczekiwany błąd w aplikacji Redis Chat. 
            Przepraszamy za niedogodności. Spróbuj odświeżyć stronę lub zgłoś problem.
          </ErrorMessage>

          <ActionButtons>
            <ActionButton onClick={this.handleReload}>
              🔄 Odśwież stronę
            </ActionButton>
            <ActionButton onClick={this.handleRetry}>
              ↻ Spróbuj ponownie
            </ActionButton>
            <ActionButton onClick={this.handleGoHome}>
              🏠 Strona główna
            </ActionButton>
            <ActionButton onClick={this.handleReportBug}>
              🐛 Zgłoś błąd
            </ActionButton>
          </ActionButtons>

          {this.state.error && (
            <ErrorDetails>
              <summary>🔧 Szczegóły techniczne (dla deweloperów)</summary>
              <div>
                <strong>Error ID:</strong> {this.state.errorId}
                <br />
                <strong>Error Message:</strong> {this.state.error.message}
                <br />
                <strong>Timestamp:</strong> {new Date().toLocaleString()}
              </div>
              {this.state.error.stack && (
                <div>
                  <strong>Stack Trace:</strong>
                  <pre>{this.state.error.stack}</pre>
                </div>
              )}
              {this.state.errorInfo?.componentStack && (
                <div>
                  <strong>Component Stack:</strong>
                  <pre>{this.state.errorInfo.componentStack}</pre>
                </div>
              )}
            </ErrorDetails>
          )}

          <TechnicalInfo>
            <strong>💡 Wskazówki:</strong>
            <ul style={{ textAlign: 'left', marginTop: '10px' }}>
              <li>Sprawdź czy Redis server jest uruchomiony</li>
              <li>Upewnij się że backend serwer działa na porcie 5000</li>
              <li>Sprawdź konsolę przeglądarki dla dodatkowych błędów</li>
              <li>Spróbuj wyczyścić cache przeglądarki</li>
            </ul>
          </TechnicalInfo>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;