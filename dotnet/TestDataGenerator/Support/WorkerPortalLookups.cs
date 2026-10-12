using System;

namespace TestDataGenerator
{
    /// <summary>
    /// Read-or-create lookups for the Orion Worker Portal controller.
    /// Some Worker Portal read methods (e.g. Queues.ReadQueueByQueueName) throw InvalidOperationException
    /// ("Sequence contains no elements") when nothing matches instead of returning 0 like the QC controller does.
    /// These wrappers return 0 / Guid.Empty for "not found" so setups can use the usual 'if (id == 0) create' pattern.
    /// </summary>
    public static class WorkerPortalLookups
    {
        public static int ReadQueueId(string queueName)
        {
            try
            {
                return Controllers.OrionWorkerPortalController.Queues.ReadQueueByQueueName(queueName);
            }
            catch (InvalidOperationException)
            {
                return 0;
            }
        }

        /// <summary>
        /// The Orion UI 'Name' of a queue schedule is stored in the Description column of the scheduled task,
        /// so scheduleName is what the test types into the schedule 'Name' box.
        /// </summary>
        public static Guid ReadQueueScheduleId(string scheduleName)
        {
            try
            {
                return Controllers.OrionWorkerPortalController.Queues.ReadQueueScheduleByDescription(scheduleName);
            }
            catch (InvalidOperationException)
            {
                return Guid.Empty;
            }
        }

        /// <summary>
        /// True when a task with this title already exists in the Worker Portal database.
        /// </summary>
        public static bool TaskExists(string taskTitle)
        {
            try
            {
                return Controllers.OrionWorkerPortalController.Tasks.ReadTaskByTitle(taskTitle) != null;
            }
            catch (InvalidOperationException)
            {
                return false;
            }
        }

        public static int ReadGroupId(string groupName, string groupDescription)
        {
            try
            {
                return Controllers.OrionWorkerPortalController.Groups.GetGroupByNameAndDescription(groupName, groupDescription);
            }
            catch (InvalidOperationException)
            {
                return 0;
            }
        }
    }
}
