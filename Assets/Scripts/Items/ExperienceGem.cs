using UnityEngine;

/// <summary>
/// 3D collectible gem dropped by defeated monsters.
/// Floats with a rotating bob and accelerates toward player when inside magnetic radius.
/// </summary>
public class ExperienceGem : MonoBehaviour
{
    [SerializeField] private int experienceValue = 10;
    [SerializeField] private float magnetDistance = 7.5f;
    [SerializeField] private float initialSpeed = 8f;
    [SerializeField] private float acceleration = 22f;
    [SerializeField] private float rotationSpeed = 120f;

    private Transform playerTransform;
    private bool isMagnetized;
    private float currentSpeed;

    private void Start()
    {
        currentSpeed = initialSpeed;
        GameObject player = GameObject.FindGameObjectWithTag("Player");
        if (player != null) playerTransform = player.transform;
    }

    private void Update()
    {
        transform.Rotate(Vector3.up, rotationSpeed * Time.deltaTime, Space.World);

        if (playerTransform == null) return;

        float dist = Vector3.Distance(transform.position, playerTransform.position);

        if (!isMagnetized && dist <= magnetDistance)
        {
            isMagnetized = true;
        }

        if (isMagnetized)
        {
            currentSpeed += acceleration * Time.deltaTime;
            Vector3 targetPos = playerTransform.position + Vector3.up * 0.8f;
            transform.position = Vector3.MoveTowards(transform.position, targetPos, currentSpeed * Time.deltaTime);

            if (dist < 1.0f)
            {
                Collect();
            }
        }
    }

    private void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            Collect();
        }
    }

    private void Collect()
    {
        if (GameManager.Instance != null)
        {
            GameManager.Instance.AddExperience(experienceValue);
        }
        Destroy(gameObject);
    }
}
