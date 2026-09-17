import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const FakeRecaptcha = ({ onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [selectedSquares, setSelectedSquares] = useState([]);
  
  // 9 squares for the grid
  const squares = Array.from({ length: 9 }, (_, i) => i);

  const handleCheckboxClick = () => {
    if (isChecked) return;
    setIsOpen(true);
  };

  const toggleSquare = (i) => {
    if (selectedSquares.includes(i)) {
      setSelectedSquares(selectedSquares.filter(s => s !== i));
    } else {
      setSelectedSquares([...selectedSquares, i]);
    }
  };

  const verify = () => {
    setIsOpen(false);
    setIsChecked(true);
    if (onChange) {
      onChange("mock-token-xyz");
    }
  };

  return (
    <>
      <div 
        onClick={handleCheckboxClick}
        style={{
          width: '304px',
          height: '78px',
          background: '#f9f9f9',
          border: '1px solid #d3d3d3',
          borderRadius: '3px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          cursor: isChecked ? 'default' : 'pointer',
          boxShadow: '0 0 4px rgba(0,0,0,0.1)',
          position: 'relative',
          userSelect: 'none'
        }}
      >
        <div style={{
          width: '28px',
          height: '28px',
          border: isChecked ? 'none' : '2px solid #c1c1c1',
          borderRadius: '2px',
          background: '#fff',
          marginRight: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s'
        }}>
          {isChecked && (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0f9d58" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          )}
        </div>
        
        <span style={{ fontFamily: 'Roboto, sans-serif', fontSize: '14px', color: '#555', flex: 1 }}>
          I'm not a robot
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img 
            src="https://www.gstatic.com/recaptcha/api2/logo_48.png" 
            alt="reCAPTCHA" 
            style={{ width: '32px', marginBottom: '4px' }} 
          />
          <span style={{ fontSize: '10px', color: '#999', fontFamily: 'Roboto, sans-serif' }}>
            reCAPTCHA
          </span>
          <span style={{ fontSize: '8px', color: '#999', fontFamily: 'Roboto, sans-serif', marginTop: '2px' }}>
            Privacy - Terms
          </span>
        </div>
      </div>

      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
              }}
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              style={{
                background: '#fff',
                border: '1px solid #ccc',
                boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                position: 'relative',
                zIndex: 10000,
                width: '400px',
                fontFamily: 'Roboto, sans-serif',
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ background: '#1a73e8', padding: '16px', color: '#fff' }}>
                <div style={{ fontSize: '14px', marginBottom: '4px' }}>Select all squares with</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>traffic lights</div>
                <div style={{ fontSize: '14px' }}>If there are none, click skip</div>
              </div>
              
              <div style={{ padding: '8px' }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '4px',
                  background: '#fff'
                }}>
                  {squares.map((sq) => {
                    const isSelected = selectedSquares.includes(sq);
                    // Use reliable placeholder images
                    let imgUrl = `https://picsum.photos/seed/captcha${sq}/200/200`;
                    
                    return (
                      <div 
                        key={sq}
                        onClick={() => toggleSquare(sq)}
                        style={{
                          aspectRatio: '1',
                          position: 'relative',
                          cursor: 'pointer',
                          background: '#f0f0f0',
                          backgroundImage: `url(${imgUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          border: isSelected ? '4px solid #1a73e8' : 'none',
                          transform: isSelected ? 'scale(0.92)' : 'none',
                          transition: 'all 0.1s'
                        }}
                      >
                        {isSelected && (
                          <div style={{
                            position: 'absolute',
                            top: '-4px', left: '-4px',
                            background: '#1a73e8',
                            borderRadius: '50%',
                            width: '20px', height: '20px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div style={{
                padding: '12px 16px',
                borderTop: '1px solid #dfdfdf',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#fafafa'
              }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }} title="Reload Challenge">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.5l5.67-5.67"/></svg>
                  </button>
                  <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }} title="Audio Challenge">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                  </button>
                  <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }} title="Info">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                  </button>
                </div>
                <button 
                  onClick={verify}
                  style={{
                    background: '#1a73e8',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '2px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    fontSize: '14px'
                  }}
                >
                  Verify
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </>
  );
};

export default FakeRecaptcha;
