using UnityEngine;

/// <summary>
/// Isometric RPG camera follow. Tracks player character from an elevated 3D diagonal angle.
/// Smoothly dampens jitter and maintains classic Diablo/Hades isometric perspective.
/// </summary>
public class CameraFollow : MonoBehaviour
{
    [Tooltip("Target transform to track (defaults to Player tag if unassigned).")]
    [SerializeField] private Transform target;

    [Tooltip("Isometric 3D offset relative to player (e.g. +X 18, +Y 24, +Z 18).")]
    [SerializeField] private Vector3 isometricOffset = new Vector3(18f, 24f, 18f);

    [Tooltip("Smoothing lag duration. Lower is tighter, higher is floatier.")]
    [SerializeField] private float smoothTime = 0.15f;

    private Vector3 currentVelocity = Vector3.zero;

    private void Start()
    {
        if (target == null)
        {
            GameObject player = GameObject.FindGameObjectWithTag("Player");
            if (player != null)
            {
                target = player.transform;
            }
        }
    }

    private void LateUpdate()
    {
        if (target == null) return;

        Vector3 targetPosition = target.position + isometricOffset;
        transform.position = Vector3.SmoothDamp(transform.position, targetPosition, ref currentVelocity, smoothTime);

        // Aim camera directly at player torso height
        transform.LookAt(target.position + Vector3.up * 1.2f);
    }
}
