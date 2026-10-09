using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace TestDataGenerator
{
	internal class QCTestSetupFactory
	{
		private readonly Dictionary<string, Type> _testSetups;
		public QCTestSetupFactory(Assembly a, Type t)
		{
			_testSetups = new Dictionary<string, Type>();
			foreach (Type type in
				 a.GetTypes()
				 .Where(myType => myType.IsClass && !myType.IsAbstract && myType.IsSubclassOf(t)))
			{
				_testSetups.Add(type.Name, type);
			}
		}

		public QCTestSetup GetTestSetup(string testCaseID)
		{
			if (_testSetups.TryGetValue(testCaseID, out var type))
				return Activator.CreateInstance(type) as QCTestSetup;
			else
				return null;
		}
	}
}
