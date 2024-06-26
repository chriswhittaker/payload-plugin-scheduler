import type { Config, Plugin } from 'payload/config'

import type { CollectionConfig } from 'payload/types'
import type { ScheduledPostConfig } from './types'
import { onInit } from './init'
import syncSchedule from './hooks/syncSchedule'
import PublishDateField from './fields/PublishDate'
import ScheduledPosts from './collections/ScheduledPosts'
import deleteSchedule from './hooks/deleteSchedule'
import boundPublishDate from './hooks/boundPublishDate'

export const ScheduledPostPlugin =
  (incomingScheduleConfig: ScheduledPostConfig): Plugin =>
  (incomingConfig: Config): Config => {
    const scheduleConfig = {...incomingScheduleConfig }
    if (!scheduleConfig.interval) {
      scheduleConfig.interval = 5
    }

    const config = { ...incomingConfig }
    const { collections } = incomingConfig

    if (collections) {
      const enabledCollections = scheduleConfig.collections || []

      const collectionsWithScheduleHooks = collections
        ?.map(collection => {
          const { hooks: existingHooks } = collection
          const isEnabled = enabledCollections.indexOf(collection.slug) > -1

          if (isEnabled) {
            const decoratedConfig: CollectionConfig = {
              ...collection,
              fields: [...collection.fields, PublishDateField(scheduleConfig)],
              hooks: {
                ...collection.hooks,
                afterChange: [...(existingHooks?.afterChange || []), syncSchedule(scheduleConfig)],
                beforeDelete: [
                  ...(existingHooks?.beforeDelete || []),
                  deleteSchedule(scheduleConfig),
                ],
                beforeChange: [
                  ...(existingHooks?.beforeChange || []),
                  boundPublishDate(scheduleConfig),
                ],
              },
            }
            return decoratedConfig
          }

          return collection
        })
        .filter(Boolean)

      config.collections = [...collectionsWithScheduleHooks, ScheduledPosts(scheduleConfig)]
    }

    config.onInit = async payload => {
      if (incomingConfig.onInit) await incomingConfig.onInit(payload)
      // Add additional onInit code by using the onInitExtension function
      onInit(scheduleConfig, payload)
    }

    return config
  }
