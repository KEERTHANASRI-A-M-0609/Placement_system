import { User } from '../models/User'

import { Notification } from '../models/Notification'

import { sendEmail } from './emailService'

import { logger } from '../utils/logger'

import { sendWhatsAppReliable } from './twilioWhatsApp'



export type NotificationType = 'info' | 'warning' | 'success' | 'danger'



export interface DispatchPayload {

  title: string

  message: string

  type: NotificationType

  moduleId?: string

  channels?: {

    email?: boolean

    whatsapp?: boolean

  }

}



export const notificationDispatch = {

  async createAndDispatch(userId: string, data: DispatchPayload) {

    const { channels, ...notificationData } = data

    const existing = await Notification.findOne({

      userId,

      title: notificationData.title,

      read: false,

      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },

    })

    if (!existing) {

      await Notification.create({ userId, ...notificationData, read: false })

    }



    // Skip duplicate outbound delivery when the in-app notification was deduped

    if (existing) return



    const user = await User.findById(userId)

    if (!user) return



    const fullMessage = `${notificationData.title}\n\n${notificationData.message}`

    const sendEmailChannel = channels?.email !== false

    const sendWhatsAppChannel = channels?.whatsapp !== false



    if (user.email && sendEmailChannel) {

      const result = await sendEmail(user.email, notificationData.title, notificationData.message)

      if (result.mode === 'logged') {

        logger.info(`[Dispatch] Email logged (SMTP not configured) for ${user.email}`)

      }

    }



    const phone = user.phone

    if (

      phone &&

      sendWhatsAppChannel &&

      (notificationData.type === 'danger' || notificationData.type === 'warning' || notificationData.type === 'success' || notificationData.type === 'info')

    ) {

      const wa = await sendWhatsAppReliable(phone, fullMessage)

      if (wa.status === 'error') {

        logger.warn(`[Dispatch] WhatsApp failed for ${userId}:`, wa.reason)

      }

    }

  },



  async dispatchEmailOnly(email: string, title: string, message: string) {

    return sendEmail(email, title, message)

  },

}


