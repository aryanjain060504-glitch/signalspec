import { User, IUser } from './user.model';
import { Project } from '../projects/project.model';
import { Review } from '../reviews/review.model';
import { PainPoint } from '../painPoints/painPoint.model';
import { Opportunity } from '../opportunities/opportunity.model';
import { Prd } from '../prds/prd.model';
import { AppError } from '../../utils/ownershipCheck';

export class UserService {
  async getProfile(userId: string): Promise<IUser> {
    const user = await User.findOne({ _id: userId, isDeleted: false });
    if (!user) throw new AppError('User profile not found', 404, 'NOT_FOUND');
    return user;
  }

  async updateProfile(
    userId: string,
    data: { name?: string; avatar?: string }
  ): Promise<IUser> {
    const user = await User.findOneAndUpdate(
      { _id: userId, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!user) throw new AppError('User profile not found', 404, 'NOT_FOUND');
    return user;
  }

  /**
   * GDPR Data Portability export
   */
  async exportUserData(userId: string): Promise<Record<string, any>> {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    const [projects, reviews, painPoints, opportunities, prds] = await Promise.all([
      Project.find({ userId, isDeleted: false }),
      Review.find({ userId }),
      PainPoint.find({ userId }),
      Opportunity.find({ userId, isDeleted: false }),
      Prd.find({ userId, isDeleted: false }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      projects,
      reviews,
      painPoints,
      opportunities,
      prds,
    };
  }

  async deleteAccount(userId: string, confirmText: string): Promise<void> {
    if (confirmText !== 'DELETE MY ACCOUNT') {
      throw new AppError(
        'Confirmation text does not match "DELETE MY ACCOUNT"',
        400,
        'CONFIRM_TEXT_MISMATCH'
      );
    }

    const user = await User.findById(userId);
    if (!user || user.isDeleted) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.refreshTokens = [];
    await user.save();

    // Soft delete associated user projects
    await Project.updateMany({ userId }, { $set: { isDeleted: true, deletedAt: new Date() } });
  }
}

export const userService = new UserService();
