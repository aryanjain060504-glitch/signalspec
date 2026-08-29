import { Request, Response, NextFunction } from 'express';
import { projectService } from './project.service';

export class ProjectController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectService.createProject(
        req.user!._id.toString(),
        req.body
      );
      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await projectService.listProjects(
        req.user!._id.toString(),
        req.query as any
      );
      res.status(200).json({
        success: true,
        data: result.projects,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectService.getProject(
        req.user!._id.toString(),
        req.params.id!
      );
      res.status(200).json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectService.updateProject(
        req.user!._id.toString(),
        req.params.id!,
        req.body
      );
      res.status(200).json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await projectService.deleteProject(
        req.user!._id.toString(),
        req.params.id!
      );
      res.status(200).json({
        success: true,
        data: { message: 'Project deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  async addCompetitor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectService.addCompetitor(
        req.user!._id.toString(),
        req.params.id!,
        req.body
      );
      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  async removeCompetitor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectService.removeCompetitor(
        req.user!._id.toString(),
        req.params.id!,
        req.params.competitorId!
      );
      res.status(200).json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dashboard = await projectService.getProjectDashboard(
        req.user!._id.toString(),
        req.params.id!
      );
      res.status(200).json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
