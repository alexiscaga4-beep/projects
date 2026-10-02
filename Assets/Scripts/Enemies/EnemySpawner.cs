using UnityEngine;

/// <summary>
/// Spawns 3D enemy waves along a circular perimeter around the player on the ground plane.
/// </summary>
public class EnemySpawner : MonoBehaviour
{
    [Header("Enemy Prefabs")]
    [SerializeField] private GameObject basicEnemyPrefab;
    [SerializeField] private GameObject bruteEnemyPrefab;

    [Header("Spawn Parameters")]
    [SerializeField] private float baseSpawnInterval = 1.6f;
    [SerializeField] private float minSpawnInterval = 0.4f;
    [SerializeField] private float spawnRadius = 38f;
    [SerializeField] private int maxSimultaneousEnemies = 80;

    private Transform playerTransform;
    private float spawnTimer;

    private void Start()
    {
        GameObject player = GameObject.FindGameObjectWithTag("Player");
        if (player != null) playerTransform = player.transform;
    }

    private void Update()
    {
        if (playerTransform == null) return;
        if (GameManager.Instance != null && GameManager.Instance.IsGameOver) return;

        float timeElapsed = GameManager.Instance != null ? GameManager.Instance.SurvivalTime : Time.time;
        float difficulty = Mathf.Clamp01(timeElapsed / 240f);
        float interval = Mathf.Lerp(baseSpawnInterval, minSpawnInterval, difficulty);

        spawnTimer += Time.deltaTime;
        if (spawnTimer >= interval)
        {
            TrySpawn(difficulty);
            spawnTimer = 0f;
        }
    }

    private void TrySpawn(float difficulty)
    {
        int activeCount = GameObject.FindGameObjectsWithTag("Enemy").Length;
        if (activeCount >= maxSimultaneousEnemies) return;

        bool spawnBrute = (bruteEnemyPrefab != null) && (difficulty > 0.3f) && (Random.value < 0.25f);
        GameObject prefab = spawnBrute ? bruteEnemyPrefab : basicEnemyPrefab;
        if (prefab == null) return;

        float angle = Random.Range(0f, Mathf.PI * 2f);
        Vector3 spawnPos = playerTransform.position + new Vector3(Mathf.Cos(angle), 0f, Mathf.Sin(angle)) * spawnRadius;
        spawnPos.y = 0f;

        Instantiate(prefab, spawnPos, Quaternion.identity);
    }

    private void OnDrawGizmosSelected()
    {
        if (playerTransform != null)
        {
            Gizmos.color = new Color(1f, 0.2f, 0.2f, 0.3f);
            Gizmos.DrawWireSphere(playerTransform.position, spawnRadius);
        }
    }
}
