import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';
import { User } from '../modules/users/user.model';
import { Project } from '../modules/projects/project.model';

describe('Core Flow (Auth & Projects)', () => {
  it('should run the complete core flow from registration to project deletion', async () => {
    // 1. Register User
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@signalspec.dev',
        password: 'Password123!',
        name: 'Test User'
      });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.data).toHaveProperty('accessToken');
    
    // Check DB User Created
    const dbUser = await User.findOne({ email: 'test@signalspec.dev' });
    expect(dbUser).toBeTruthy();
    expect(dbUser?.name).toBe('Test User');

    // 2. Login User
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@signalspec.dev',
        password: 'Password123!'
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data).toHaveProperty('accessToken');
    
    const accessToken = loginRes.body.data.accessToken;

    // 3. Create Project
    const createRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Test Project',
        description: 'Testing the core flow',
        targetIcp: 'Founders',
        competitors: [
          { name: 'CompA', website: 'https://compa.com' }
        ]
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.name).toBe('Test Project');
    const projectId = createRes.body.data._id;

    // Check DB Project Created
    const dbProject = await Project.findById(projectId);
    expect(dbProject).toBeTruthy();
    expect(dbProject?.name).toBe('Test Project');
    expect(dbProject?.userId.toString()).toBe(dbUser?._id.toString());
  
    // 4. Update Project
    const updateRes = await request(app)
      .patch(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Updated Test Project'
      });
      
    expect(updateRes.status).toBe(200);
    
    // Check DB Project Updated
    const updatedDbProject = await Project.findById(projectId);
    expect(updatedDbProject?.name).toBe('Updated Test Project');
  
    // 5. Delete Project
    const deleteRes = await request(app)
      .delete(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`);
      
    expect(deleteRes.status).toBe(200);
    
    // Check DB Project Deleted (soft delete)
    const deletedDbProject = await Project.findById(projectId);
    expect(deletedDbProject?.isDeleted).toBe(true);
  });
});
