import nodemailer from "nodemailer";
import { webData } from "../constants/webData";

const transporter = nodemailer.createTransport({
  service: "gmail", // Can be customized
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendEnquiryEmail(
  name: string,
  email: string,
  message: string,
) {
  const mailOptions = {
    from: `"${webData.websiteName} Notifications" <${process.env.EMAIL_USER}>`,
    to: webData.email, // Assume owner's email from constants
    replyTo: email,
    subject: `New Enquiry Received from ${name}`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
        <div style="background-color: #000; color: #fff; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">${webData.websiteName}</h1>
          <p style="margin: 5px 0 0; color: #ccc;">New Enquiry Received</p>
        </div>
        <div style="background-color: #fff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}" style="color: #0070f3;">${email}</a></p>
          <div style="margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #000; font-style: italic;">
            ${message.replace(/\n/g, "<br/>")}
          </div>
          <p style="margin-top: 30px; text-align: center;">
            <a href="mailto:${email}" style="background-color: #000; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reply Directly</a>
          </p>
        </div>
        <p style="text-align: center; color: #888; font-size: 12px; margin-top: 20px;">
          ${webData.footer.copyright}
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Email processing error:", error);
    return { success: false, error };
  }
}

export async function forgotCodeEmail(email: string, code: string) {
  const mailOptions = {
    from: `"${webData.websiteName} Security"`,
    to: email,
    subject: "Forgot Password",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password - ${webData.websiteName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; line-height: 1.6;">
        
        <!-- Main Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 0;">
          <tr>
            <td align="center">
              
              <!-- Email Container -->
              <table width="100%" max-width="600px" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); overflow: hidden;">
                
                <!-- Header with Gradient -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">${webData.websiteName}</h1>
                    <p style="margin: 10px 0 0; color: #a0a0a0; font-size: 14px;">Password Reset Request</p>
                  </td>
                </tr>
                
                <!-- Content Section -->
                <tr>
                  <td style="padding: 40px 30px;">
                    
                    <!-- Greeting -->
                    <h2 style="margin: 0 0 10px 0; color: #1a1a2e; font-size: 24px; font-weight: 600;">Reset Your Password</h2>
                    <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px;">We received a request to reset the password for your account.</p>
                    
                    <!-- Security Notice -->
                    <div style="background-color: #fff8e7; border-left: 4px solid #ffc107; padding: 12px 16px; margin: 20px 0; border-radius: 8px;">
                      <p style="margin: 0; color: #856404; font-size: 14px;">
                        <strong>🔐 Security Notice:</strong> If you didn't request this, please ignore this email. Your password will remain unchanged.
                      </p>
                    </div>
                    
                    <!-- Verification Code Box -->
                    <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
                      <p style="margin: 0 0 12px 0; color: #495057; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Verification Code</p>
                      <div style="background-color: #ffffff; border-radius: 12px; padding: 20px; display: inline-block; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
                        <code style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a2e; font-family: 'Courier New', monospace;">${code}</code>
                      </div>
                      <p style="margin: 20px 0 0 0; color: #6c757d; font-size: 13px;">
                        This code will expire in <strong>10 minutes</strong>
                      </p>
                    </div>
                    
                    <!-- Instructions -->
                    <div style="margin: 30px 0;">
                      <h3 style="margin: 0 0 15px 0; color: #1a1a2e; font-size: 18px;">📋 Instructions:</h3>
                      <ol style="margin: 0; padding-left: 20px; color: #666666;">
                        <li style="margin-bottom: 10px;">Enter this 6-digit code on the password reset page</li>
                        <li style="margin-bottom: 10px;">Create a new strong password</li>
                        <li style="margin-bottom: 10px;">Log in with your new credentials</li>
                      </ol>
                    </div>
                    
                    <!-- Account Details -->
                    <div style="background-color: #f8f9fa; border-radius: 12px; padding: 20px; margin: 30px 0;">
                      <p style="margin: 0 0 8px 0; font-size: 14px; color: #6c757d;">
                        <strong>Account:</strong> ${email}
                      </p>
                      <p style="margin: 0; font-size: 12px; color: #6c757d;">
                        <strong>Request Time:</strong> ${new Date().toLocaleString()}
                      </p>
                    </div>
                    
                    <!-- Support Link -->
                    <div style="text-align: center; margin: 30px 0 20px 0;">
                      <a href="${process.env.NEXT_PUBLIC_BASE_URL || "#"}" style="display: inline-block; background-color: #1a1a2e; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px; transition: all 0.3s ease;">Contact Support</a>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0 20px 0;">
                    
                    <!-- Footer Note -->
                    <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                      For security reasons, never share this code with anyone.<br>
                      Our team will never ask for your verification code.
                    </p>
                    
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f9fa; padding: 30px; text-align: center;">
                    <p style="margin: 0 0 10px 0; color: #666666; font-size: 12px;">
                      © ${new Date().getFullYear()} ${webData.websiteName}. All rights reserved.
                    </p>
                    <p style="margin: 0; color: #999999; font-size: 11px;">
                      This is an automated message, please do not reply to this email.
                    </p>
                    ${webData.address ? `<p style="margin: 10px 0 0 0; color: #999999; font-size: 11px;">${webData.address}</p>` : ""}
                  </td>
                </tr>
                
              </table>
              
            </td>
          </tr>
        </table>
        
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Email processing error:", error);
    return { success: false, error };
  }
}

export async function adminApprovedEmail(email: string, username: string) {
  const mailOptions = {
    from: `"${webData.websiteName} Administration" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Application Approved - Welcome to the Team!",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Approved - ${webData.websiteName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="100%" max-width="600px" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); overflow: hidden;">
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Welcome, ${username}!</h1>
                    <p style="margin: 10px 0 0; color: #d1fae5; font-size: 14px;">Your Administrator application has been approved.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 10px 0; color: #1a1a2e; font-size: 24px; font-weight: 600;">Account Activated</h2>
                    <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px;">We are pleased to inform you that your application for a position on our administrative team has been accepted. Your dashboard access is now fully authorized.</p>
                    
                    <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 8px;">
                      <p style="margin: 0; color: #065f46; font-size: 14px;"><strong>Next Steps:</strong> You can now log in to the Genesis Portal using your registered email and password to access the administrative dashboard.</p>
                    </div>
                    
                    <div style="text-align: center; margin: 40px 0;">
                      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/login" style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Access Portal</a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f8f9fa; padding: 30px; text-align: center;">
                    <p style="margin: 0 0 10px 0; color: #666666; font-size: 12px;">© ${new Date().getFullYear()} ${webData.websiteName}. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };
  return await transporter.sendMail(mailOptions);
}

export async function adminRejectedEmail(email: string, username: string) {
  const mailOptions = {
    from: `"${webData.websiteName} Administration" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Application Update - ${webData.websiteName}",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Update - ${webData.websiteName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="100%" max-width="600px" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); overflow: hidden;">
                <tr>
                  <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Application Update</h1>
                    <p style="margin: 10px 0 0; color: #fee2e2; font-size: 14px;">Administrator position update for ${username}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 10px 0; color: #1a1a2e; font-size: 24px; font-weight: 600;">Application Status</h2>
                    <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px;">Thank you for your interest in joining our administrative team. After careful consideration, we regret to inform you that we are unable to approve your application at this time.</p>
                    <p style="margin: 0; color: #666666; font-size: 16px;">If you believe this decision was made in error or have additional information to provide, please do not hesitate to contact our support team.</p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f8f9fa; padding: 30px; text-align: center;">
                    <p style="margin: 0 0 10px 0; color: #666666; font-size: 12px;">© ${new Date().getFullYear()} ${webData.websiteName}. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };
  return await transporter.sendMail(mailOptions);
}

export async function notifyOwnerNewAdmin(ownerEmail: string, adminDetails: { username: string, email: string }) {
  const mailOptions = {
    from: `"${webData.websiteName} System" <${process.env.EMAIL_USER}>`,
    to: ownerEmail,
    subject: `New Admin Account Created: ${adminDetails.username}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Admin Application - ${webData.websiteName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="100%" max-width="600px" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); overflow: hidden;">
                <tr>
                  <td style="background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Admin Application Received</h1>
                    <p style="margin: 10px 0 0; color: #E0E7FF; font-size: 14px;">A new account with role "admin" is awaiting review.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px 0; color: #1a1a2e; font-size: 16px;">Hello Owner,</p>
                    <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px;">A new administrator registration has been detected. The applicant's details:</p>
                    
                    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 20px; border-radius: 12px; margin: 20px 0;">
                      <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px;"><strong>Username:</strong> ${adminDetails.username}</p>
                      <p style="margin: 0; color: #475569; font-size: 14px;"><strong>Email:</strong> ${adminDetails.email}</p>
                    </div>
                    
                    <div style="text-align: center; margin: 40px 0;">
                      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/pending-admins" style="display: inline-block; background-color: #6366F1; color: #ffffff; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Review Application</a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f8f9fa; padding: 30px; text-align: center;">
                    <p style="margin: 0 0 10px 0; color: #666666; font-size: 12px;">© ${new Date().getFullYear()} ${webData.websiteName}. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };
  return await transporter.sendMail(mailOptions);
}
