using System;
using UnityEngine;
using UnityEngine.SceneManagement;

/// <summary>
/// Central game controller implementing the Singleton pattern.
/// Manages gameplay states, game clock, progression leveling, and scene transitions.
/// </summary>
public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    [Header("Progression Balancing")]
    [SerializeField] private int baseExperienceToLevel = 50;
    [SerializeField] private float experienceScalingFactor = 1.35f;

    // Public State Variables
    public int CurrentLevel { get; private set; } = 1;
    public int CurrentExperience { get; private set; } = 0;
    public int ExperienceToNextLevel { get; private set; }
    public int EnemiesDefeated { get; private set; } = 0;
    public float SurvivalTime { get; private set; } = 0f;
    public bool IsGameOver { get; private set; } = false;

    // Decoupled Observer Events for UI and Systems
    public static event Action<int, int, int> OnExperienceUpdated; // (currentExp, expRequired, currentLevel)
    public static event Action<int> OnLevelUp;                    // (newLevel)
    public static event Action<int> OnEnemiesDefeatedUpdated;     // (totalKills)
    public static event Action OnGameOver;

    private void Awake()
    {
        // Enforce single instance across lifetime
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;

        Time.timeScale = 1f; // Ensure time is restored if previously game over
        ExperienceToNextLevel = baseExperienceToLevel;
    }

    private void Start()
    {
        // Broadcast initial state to UI
        OnExperienceUpdated?.Invoke(CurrentExperience, ExperienceToNextLevel, CurrentLevel);
        OnEnemiesDefeatedUpdated?.Invoke(EnemiesDefeated);
    }

    private void Update()
    {
        if (!IsGameOver)
        {
            SurvivalTime += Time.deltaTime;
        }

        // Quick developer shortcut: press 'R' to restart when game over
        if (IsGameOver && Input.GetKeyDown(KeyCode.R))
        {
            RestartGame();
        }
    }

    /// <summary>
    /// Adds experience, evaluates level-up thresholds, and triggers bonuses.
    /// </summary>
    public void AddExperience(int amount)
    {
        if (IsGameOver) return;

        CurrentExperience += amount;

        while (CurrentExperience >= ExperienceToNextLevel)
        {
            CurrentExperience -= ExperienceToNextLevel;
            CurrentLevel++;
            ExperienceToNextLevel = Mathf.RoundToInt(ExperienceToNextLevel * experienceScalingFactor);

            ApplyLevelUpRewards();
            OnLevelUp?.Invoke(CurrentLevel);
        }

        OnExperienceUpdated?.Invoke(CurrentExperience, ExperienceToNextLevel, CurrentLevel);
    }

    private void ApplyLevelUpRewards()
    {
        // Auto-upgrade player combat stats upon leveling up
        GameObject player = GameObject.FindGameObjectWithTag("Player");
        if (player != null)
        {
            // Increase attack speed slightly
            if (player.TryGetComponent<AutoAttack>(out var attack))
            {
                attack.UpgradeAttackSpeed(0.08f);
                attack.UpgradeDamage(5);
            }

            // Restore small chunk of health as celebration
            if (player.TryGetComponent<PlayerHealth>(out var health))
            {
                health.Heal(20);
            }
        }
    }

    public void RegisterEnemyDefeated()
    {
        EnemiesDefeated++;
        OnEnemiesDefeatedUpdated?.Invoke(EnemiesDefeated);
    }

    public void TriggerGameOver()
    {
        if (IsGameOver) return;

        IsGameOver = true;
        Time.timeScale = 0f; // Freeze game simulation
        OnGameOver?.Invoke();
    }

    public void RestartGame()
    {
        Time.timeScale = 1f;
        SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex);
    }
}
