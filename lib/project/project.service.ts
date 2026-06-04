'use client';

import { ProjectApi } from './project.api';

export const ProjectService = {
    findAll: () => {
        return ProjectApi.findAll();
    },
};
