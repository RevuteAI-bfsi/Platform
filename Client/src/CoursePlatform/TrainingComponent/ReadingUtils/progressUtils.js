import progressService from "../../../Services/progressService";

export const loadCompletedPassages = async (
  setPassagesLoading,
  setCompletedPassages
) => {
  try {
    setPassagesLoading(true); // Start loading passages progress

    const userId = localStorage.getItem("userId");
    if (!userId) {
      setPassagesLoading(false);
      return;
    }

    // Try to get from database first
    try {
      const userProgress = await progressService.getUserProgress(userId);
      const trainingProgress = userProgress.trainingProgress || {};

      let completed = [];

      if (trainingProgress.reading) {
        if (Array.isArray(trainingProgress.reading)) {
          completed = trainingProgress.reading
            .map((result) => result.passageId || result.exerciseId)
            .filter((id) => id)
            .filter((value, index, self) => self.indexOf(value) === index);
        } else {
          completed = Object.keys(trainingProgress.reading);
        }
      }

      console.log("Completed passages from DB:", completed);

      // Update state with database data
      setCompletedPassages(completed);

      // Update localStorage as backup
      localStorage.setItem(
        "completed_reading_passages",
        JSON.stringify(completed)
      );
    } catch (dbError) {
      console.error("Database fetch error:", dbError);

      // Fall back to localStorage only if database fetch fails
      const cachedPassages = localStorage.getItem("completed_reading_passages");
      if (cachedPassages) {
        setCompletedPassages(JSON.parse(cachedPassages));
      }
    }
  } catch (error) {
    console.error("Error loading completed passages:", error);
  } finally {
    setPassagesLoading(false);
  }
};

export const checkLearningCompletion = async (
  learningCompleted,
  setError,
  setLearningCompleted,
  setProgressLoaded,
  setPassagesLoading,
  setCompletedPassages
) => {
  try {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      setError("User not logged in");
      return;
    }
    console.log("Checking learning completion for reading training");

    const completedTopicsFromStorage = JSON.parse(
      localStorage.getItem("softskills_completed") || "[]"
    );

    const learningTopics = [
      "parts-of-speech",
      "tenses",
      "sentence-correction",
      "communication",
    ];

    const allCompletedInStorage = learningTopics.every((topic) =>
      completedTopicsFromStorage.includes(topic)
    );

    console.log(
      `Learning completion status from localStorage: ${allCompletedInStorage}`
    );

    if (allCompletedInStorage) {
      setLearningCompleted(true);
      await loadCompletedPassages(setPassagesLoading, setCompletedPassages);
      setProgressLoaded(true);
      return;
    }

    const { learningProgress } = await progressService.getUserProgress(userId);
    const softskillsProgress = learningProgress.softskills || {};

    learningTopics.forEach((topic) => {
      console.log(
        `Topic ${topic} completed in database: ${!!softskillsProgress[topic]}`
      );
    });

    const allCompletedInDB = learningTopics.every(
      (topic) => softskillsProgress[topic]
    );

    if (allCompletedInDB) {
      setLearningCompleted(true);
      await loadCompletedPassages(setPassagesLoading, setCompletedPassages);
      setProgressLoaded(true);
    } else {
      setLearningCompleted(false);
      setProgressLoaded(true);
    }
  } catch (error) {
    console.error("Error checking learning completion:", error);
    setError("Failed to check learning completion");
    setProgressLoaded(true);
  }
};