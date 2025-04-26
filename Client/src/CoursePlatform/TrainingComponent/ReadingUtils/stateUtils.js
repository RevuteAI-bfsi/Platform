import progressService from "../../../Services/progressService";

export const calculateCompletionPercentage = (completedPassages, passages) => {
    const percentage = (completedPassages.length / passages.length) * 100;
    return Math.min(percentage, 100);
};

export const isPassageCompleted = (passageId, completedPassages) => {
    const passageIdStr = String(passageId);
    return completedPassages.some((id) => String(id) === passageIdStr);
};

export const loadAttemptHistory = async (passageId, setAttemptHistory, setBestAttempt, setgetreadingProgress) => {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      const userProgress = await progressService.getUserProgress(userId);
      const trainingProgress = userProgress.trainingProgress || {};
      setgetreadingProgress(trainingProgress);

      if (
        trainingProgress.reading &&
        typeof trainingProgress.reading === "object" &&
        !Array.isArray(trainingProgress.reading)
      ) {
        const passageData = trainingProgress.reading[passageId];
        if (
          passageData &&
          passageData.metrics &&
          Array.isArray(passageData.metrics)
        ) {
          setAttemptHistory(passageData.metrics);

          if (passageData.metrics.length > 0) {
            const bestAttempt = passageData.metrics.reduce((best, current) =>
              current.overall_score > best.overall_score ? current : best
            );
            setBestAttempt(bestAttempt);
          }
        } else {
          setAttemptHistory([]);
          setBestAttempt(null);
        }
      } else {
        const history = (trainingProgress.reading || []).filter(
          (result) => result.passageId === passageId
        );
        setAttemptHistory(history);
        setBestAttempt(null);
      }
    } catch (error) {
      console.error("Error loading attempt history:", error);
    }
  };