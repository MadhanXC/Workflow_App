import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Preview,
} from '@react-email/components';

interface ReportEmailProps {
  recipientEmail: string;
}

export const ReportEmail = ({ recipientEmail }: ReportEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your Task Report from Premier Lightings</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={section}>
            <Text style={heading}>Task Report</Text>
            <Text style={paragraph}>
              Please find attached the requested task report.
            </Text>
            <Text style={paragraph}>
              This report was generated for {recipientEmail}.
            </Text>
            <Text style={footer}>
              This is an automated message, please do not reply.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const section = {
  padding: '0 48px',
};

const heading = {
  fontSize: '24px',
  letterSpacing: '-0.5px',
  lineHeight: '1.3',
  fontWeight: '400',
  color: '#484848',
  padding: '17px 0 0',
};

const paragraph = {
  margin: '0 0 15px',
  fontSize: '15px',
  lineHeight: '1.4',
  color: '#3c4149',
};

const footer = {
  fontSize: '12px',
  lineHeight: '1.5',
  color: '#8898aa',
  marginTop: '30px',
};