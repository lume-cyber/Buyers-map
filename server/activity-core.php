<?php
function activityEntry(array $actor, string $action, string $target, string $label, array $changes = []): array {
    return ['id'=>bin2hex(random_bytes(12)), 'at'=>gmdate('c'), 'actor'=>$actor['id'], 'actorName'=>$actor['name'], 'action'=>$action, 'target'=>$target, 'label'=>$label, 'changes'=>$changes];
}
