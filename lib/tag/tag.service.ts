'use client'

import { TagApi } from './tag.api'

export const TagService = {
  findAll: () => {
    return TagApi.findAll()
  },
}
