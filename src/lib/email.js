import nodemailer from 'nodemailer';

// 1. Configuração do Transporter (O "entregador" de e-mails)
// Ao usar o service 'gmail', o Nodemailer já configura host e portas automaticamente.
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export async function sendResetPasswordEmail(email, resetUrl) {
    try {
        // 2. Trocamos o 'resend.emails.send' pelo 'transporter.sendMail'
        await transporter.sendMail({
            from: `HelpFlow <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Recuperação de senha - HelpFlow',
            html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #14b8a6;">Recuperação de Senha</h2>
          <p>Olá,</p>
          <p>Você solicitou a redefinição da sua senha.</p>
          <p>Clique no botão abaixo para criar uma nova senha:</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #14b8a6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Redefinir Senha
          </a>
          <p style="color: #666; font-size: 14px;">
            Se você não solicitou esta alteração, ignore este email.
          </p>
          <p style="color: #666; font-size: 14px;">
            Este link expira em 15 minutos.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            HelpFlow - Sistema de suporte simplificado
          </p>
        </body>
        </html>
      `,
        });

        return { success: true };
    } catch (error) {
        console.error('Erro ao enviar email via Nodemailer:', error);
        return { success: false, error };
    }
}