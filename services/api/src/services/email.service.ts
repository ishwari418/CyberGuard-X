import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail', // Or use host/port for other providers
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const sendEmail = async (to: string, subject: string, text: string) => {
    // Check if credentials exist
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('================ EMAIL SERVICE (MOCK) ================');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body: \n${text}`);
        console.log('======================================================');
        console.log('NOTE: Real email not sent. Configure .env with EMAIL_USER and EMAIL_PASS to enable.');
        return true; // Simulate success
    }

    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            text,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

export const sendSecurityAlert = async (to: string, activity: string) => {
    const subject = 'Security Alert: Suspicious Activity Detected';
    const text = `Hello,\n\nWe detected suspicious activity on your account: ${activity}.\n\nIf this was not you, please secure your account immediately.\n\nRegards,\nCyberGuard Team`;
    return sendEmail(to, subject, text);
};
