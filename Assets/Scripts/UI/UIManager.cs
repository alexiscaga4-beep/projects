using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Controls Head-Up Display (HUD) presentation and Game Over modal screens.
/// Subscribes to events from PlayerHealth and GameManager to maintain zero tightly-coupled dependencies.
/// </summary>
public class UIManager : MonoBehaviour
{
    [Header("Health HUD")]
    [SerializeField] private Slider healthSlider;
    [SerializeField] private Text healthText;

    [Header("Progression HUD")]
    [SerializeField] private Slider xpSlider;
    [SerializeField] private Text levelText;
    [SerializeField] private Text killsText;
    [SerializeField] private Text timerText;

    [Header("Game Over Screen")]
    [SerializeField] private GameObject gameOverPanel;
    [SerializeField] private Text finalTimeText;
    [SerializeField] private Text finalKillsText;
    [SerializeField] private Button restartButton;

    private void Awake()
    {
        if (gameOverPanel != null)
        {
            gameOverPanel.SetActive(false);
        }

        if (restartButton != null)
        {
            restartButton.onClick.AddListener(OnRestartClicked);
        }
    }

    private void OnEnable()
    {
        // Subscribe to architectural events
        PlayerHealth.OnHealthChanged += HandleHealthChanged;
        GameManager.OnExperienceUpdated += HandleExperienceUpdated;
        GameManager.OnEnemiesDefeatedUpdated += HandleKillsUpdated;
        GameManager.OnGameOver += HandleGameOver;
    }

    private void OnDisable()
    {
        // Unsubscribe to avoid memory leaks or dangling delegate references
        PlayerHealth.OnHealthChanged -= HandleHealthChanged;
        GameManager.OnExperienceUpdated -= HandleExperienceUpdated;
        GameManager.OnEnemiesDefeatedUpdated -= HandleKillsUpdated;
        GameManager.OnGameOver -= HandleGameOver;
    }

    private void Update()
    {
        // Update timer display while game is actively running
        if (GameManager.Instance != null && !GameManager.Instance.IsGameOver && timerText != null)
        {
            float time = GameManager.Instance.SurvivalTime;
            int minutes = Mathf.FloorToInt(time / 60f);
            int seconds = Mathf.FloorToInt(time % 60f);
            timerText.text = $"{minutes:00}:{seconds:00}";
        }
    }

    private void HandleHealthChanged(int current, int max)
    {
        if (healthSlider != null)
        {
            healthSlider.maxValue = max;
            healthSlider.value = current;
        }

        if (healthText != null)
        {
            healthText.text = $"{current} / {max} HP";
        }
    }

    private void HandleExperienceUpdated(int currentExp, int maxExp, int level)
    {
        if (xpSlider != null)
        {
            xpSlider.maxValue = maxExp;
            xpSlider.value = currentExp;
        }

        if (levelText != null)
        {
            levelText.text = $"LV. {level}";
        }
    }

    private void HandleKillsUpdated(int totalKills)
    {
        if (killsText != null)
        {
            killsText.text = $"Foes Slain: {totalKills}";
        }
    }

    private void HandleGameOver()
    {
        if (gameOverPanel != null)
        {
            gameOverPanel.SetActive(true);

            if (GameManager.Instance != null)
            {
                float time = GameManager.Instance.SurvivalTime;
                int minutes = Mathf.FloorToInt(time / 60f);
                int seconds = Mathf.FloorToInt(time % 60f);

                if (finalTimeText != null)
                {
                    finalTimeText.text = $"Time Survived: {minutes:00}:{seconds:00}";
                }

                if (finalKillsText != null)
                {
                    finalKillsText.text = $"Foes Defeated: {GameManager.Instance.EnemiesDefeated} (Level {GameManager.Instance.CurrentLevel})";
                }
            }
        }
    }

    private void OnRestartClicked()
    {
        if (GameManager.Instance != null)
        {
            GameManager.Instance.RestartGame();
        }
    }
}
