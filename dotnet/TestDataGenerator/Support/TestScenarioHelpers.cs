using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace TestDataGenerator
{
    public class TestScenarioHelper
    {
        public static string DirectoryPath = new DirectoryInfo(AppDomain.CurrentDomain.BaseDirectory).Parent.Parent.FullName;
        Random random = new Random();

        public Dictionary<string, string> GetTestScenarioData(string testID)
        {
            string jsonFile = File.ReadAllText($"{DirectoryPath}\\ScenarioData\\{testID}Data.json");
            var testData = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonFile);

            return testData;
        }

        public void WriteTestScenarioData(string testID, Dictionary<string, string> testData)
        {
            var dataFile = $"{DirectoryPath}\\ScenarioData\\{testID}Data.json";

            //File.WriteAllLines(dataFile, testData);

            string json = JsonConvert.SerializeObject(testData, Formatting.Indented);
            File.WriteAllText(dataFile, json);
        }

        public void WriteTestScenarioData(string testID, Dictionary<string, object> testData)
        {
            var dataFile = $"{DirectoryPath}\\ScenarioData\\{testID}Data.json";

            string json = JsonConvert.SerializeObject(testData, Formatting.Indented);
            File.WriteAllText(dataFile, json);
        }

        public T PickRandom<T>(IEnumerable<T> source)
        {
            var items = source.ToList();
            if (items.Count == 0)
                throw new InvalidOperationException($"No values returned from QC.");

            return items[random.Next(items.Count)];
        }

    }
}
