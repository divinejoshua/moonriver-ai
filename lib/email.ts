import { SendMailClient } from 'zeptomail'

const client = new SendMailClient({
  url: 'https://api.zeptomail.eu/v1.1/email',
  token: process.env.ZEPTOMAIL_TOKEN!,
})

export async function sendVideoReadyEmail(toEmail: string, toName: string, projectId: string): Promise<void> {
  await client.sendMail({
    from: {
      address: 'noreply@tabseditor.com',
      name: 'Moonriver',
    },
    to: [
      {
        email_address: {
          address: toEmail,
          name: toName,
        },
      },
    ],
    subject: 'Your UGC video is ready',
    htmlbody: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="font-size: 20px; font-weight: 600; color: #111;">Your video is ready</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.5;">
          Hi ${toName}, your UGC video has finished generating and is ready to download.
        </p>
        <a
          href="${process.env.NEXT_PUBLIC_APP_URL}/projects/${projectId}/generating"
          style="display: inline-block; margin-top: 16px; background: #000; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;"
        >
          View &amp; Download
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 32px;">
          You received this email because you generated a video on Moonriver.
        </p>
      </div>
    `,
  })
}
