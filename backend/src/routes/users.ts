import express, { Response } from 'express'
import { authService } from '../services/authService'
import { sessionSyncService } from '../services/sessionSyncService'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { validate, schemas } from '../utils/validators'

const router = express.Router()

router.use(authMiddleware)

router.get(
  '/profile',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await authService.getUserById(req.user!.userId)
    res.json(user)
  })
)

router.put(
  '/profile',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = validate(req.body, schemas.updateProfile)
    const user = await authService.updateUserProfile(req.user!.userId, data)
    res.json(user)
  })
)

router.post(
  '/sync-session',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = validate(req.body, schemas.syncSession)
    const result = await sessionSyncService.syncUserSession(req.user!.userId, data)
    res.json(result)
  })
)

router.get(
  '/session',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionLoadService } = await import('../services/sessionLoadService')
    const session = await sessionLoadService.loadUserSession(req.user!.userId)
    if (!session) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    res.json(session)
  })
)

export default router
