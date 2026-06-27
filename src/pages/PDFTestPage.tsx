/**
 * PDF Test Page - Quick testing for PDF download feature
 * Test different scenarios and edge cases
 */

import React from 'react';
import { PDFDownloadButton } from '../components/ui/PDFDownloadButton';
import { GaugeChart } from '../components/charts/GaugeChart';
import { BentoGrid, BentoCard } from '../components/bento';

export const PDFTestPage: React.FC = () => {
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>PDF Download Feature - Test Page</h1>

      {/* Test 1: Simple Content */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Test 1: Simple Content</h2>
        <PDFDownloadButton
          targetSelector=".test-simple"
          filename="test-simple.pdf"
          title="Simple Content Test"
          variant="primary"
          size="md"
        />
        <div className="test-simple" data-pdf-export style={{ 
          marginTop: '1rem', 
          padding: '2rem', 
          border: '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: '#f9fafb'
        }}>
          <h3>Simple Test Content</h3>
          <p>This is a simple paragraph to test basic PDF generation.</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
            <li>Item 3</li>
          </ul>
        </div>
      </section>

      {/* Test 2: Chart with Gradient */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Test 2: Chart with Circumferential Gradient</h2>
        <PDFDownloadButton
          targetSelector=".test-chart"
          filename="test-chart-gradient.pdf"
          title="Chart Gradient Test"
          variant="secondary"
          size="md"
        />
        <div className="test-chart" data-pdf-export style={{ 
          marginTop: '1rem', 
          padding: '2rem', 
          border: '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          display: 'flex',
          gap: '2rem',
          justifyContent: 'center'
        }}>
          <GaugeChart 
            value={85} 
            label="Ketakmiran" 
            category="ketakmiran" 
            size="large" 
            showValue={true}
          />
          <GaugeChart 
            value={72} 
            label="Pembinaan" 
            category="pembinaan" 
            size="large" 
            showValue={true}
            useZoneColors={true}
          />
          <GaugeChart 
            value={68} 
            label="Aktualisasi" 
            category="aktualisasi" 
            size="large" 
            showValue={true}
          />
        </div>
      </section>

      {/* Test 3: Bento Grid Layout */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Test 3: Complex Bento Grid</h2>
        <PDFDownloadButton
          targetSelector=".test-bento"
          filename="test-bento-layout.pdf"
          title="Bento Grid Layout Test"
          subtitle="Complex Layout Testing"
          variant="outline"
          size="lg"
        />
        <div className="test-bento" data-pdf-export style={{ marginTop: '1rem' }}>
          <BentoGrid>
            <BentoCard size="medium" title="Card 1" category="ketakmiran">
              <GaugeChart value={85} category="ketakmiran" size="medium" />
            </BentoCard>
            <BentoCard size="medium" title="Card 2" category="pembinaan">
              <GaugeChart value={78} category="pembinaan" size="medium" />
            </BentoCard>
            <BentoCard size="medium" title="Card 3" category="aktualisasi">
              <GaugeChart value={92} category="aktualisasi" size="medium" />
            </BentoCard>
            <BentoCard size="medium" title="Card 4" category="internal">
              <GaugeChart value={81} category="internal" size="medium" />
            </BentoCard>
          </BentoGrid>
        </div>
      </section>

      {/* Test 4: Very Tall Content (Multi-page) */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Test 4: Multi-Page Content (Very Tall)</h2>
        <PDFDownloadButton
          targetSelector=".test-tall"
          filename="test-multipage.pdf"
          title="Multi-Page Test"
          subtitle="Should split into multiple pages"
          variant="primary"
          size="md"
        />
        <div className="test-tall" data-pdf-export style={{ 
          marginTop: '1rem', 
          padding: '2rem', 
          border: '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: '#f9fafb'
        }}>
          <h3>Very Tall Content</h3>
          <p>This content is intentionally tall to test multi-page PDF generation.</p>
          
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} style={{ 
              marginBottom: '2rem', 
              padding: '1rem', 
              backgroundColor: '#fff',
              borderRadius: '4px',
              border: '1px solid #e5e7eb'
            }}>
              <h4>Section {i + 1}</h4>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
                Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
              </p>
              {i % 3 === 0 && (
                <GaugeChart 
                  value={Math.random() * 100} 
                  category={['ketakmiran', 'pembinaan', 'aktualisasi', 'internal'][i % 4] as any}
                  size="small"
                />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Test 5: Error Handling */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Test 5: Error Handling (Invalid Selector)</h2>
        <PDFDownloadButton
          targetSelector=".nonexistent-selector"
          filename="test-error.pdf"
          title="Error Handling Test"
          variant="primary"
          size="md"
          onError={(error) => {
            console.log('Error handled correctly:', error.message);
          }}
        />
        <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
          ⚠️ This button should show an error message because the selector doesn't exist.
          Check console and toast notification.
        </p>
      </section>

      {/* Instructions */}
      <section style={{ 
        marginTop: '4rem', 
        padding: '2rem', 
        backgroundColor: '#f0fdf4',
        borderRadius: '8px',
        border: '2px solid #86efac'
      }}>
        <h2>✅ Testing Checklist</h2>
        <ul style={{ lineHeight: '1.8' }}>
          <li>[ ] Test 1: Simple content downloads correctly</li>
          <li>[ ] Test 2: Charts with gradients render properly in PDF</li>
          <li>[ ] Test 3: Bento grid layout preserves structure</li>
          <li>[ ] Test 4: Multi-page PDF splits content correctly</li>
          <li>[ ] Test 4: Page numbers appear on multi-page PDF</li>
          <li>[ ] Test 5: Error message shows for invalid selector</li>
          <li>[ ] Loading indicators appear during generation</li>
          <li>[ ] Progress messages update correctly</li>
          <li>[ ] Toast notifications show (success/error)</li>
          <li>[ ] Button is disabled during generation</li>
          <li>[ ] PDF metadata includes title and timestamp</li>
        </ul>
      </section>
    </div>
  );
};

export default PDFTestPage;
